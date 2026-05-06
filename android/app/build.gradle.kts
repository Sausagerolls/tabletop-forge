import java.util.Properties

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.compose")
    id("org.jetbrains.kotlin.plugin.serialization")
}

// Release signing config — loaded from android/keystore.properties,
// which is gitignored. Format:
//   storeFile=keystore/release.jks
//   storePassword=…
//   keyAlias=tabletopforge
//   keyPassword=…
// File missing? `signingConfigs.release` falls back to no-op so debug
// builds and CI still work; only release builds need the keystore.
val keystorePropsFile = rootProject.file("keystore.properties")
val keystoreProps = Properties().apply {
    if (keystorePropsFile.exists()) load(keystorePropsFile.inputStream())
}

android {
    namespace = "com.tabletopforge"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.tabletopforge"
        minSdk = 26
        targetSdk = 34
        versionCode = 9
        versionName = "1.9.13"
    }

    signingConfigs {
        create("release") {
            val storePath = keystoreProps.getProperty("storeFile")
            if (storePath != null) {
                // storeFile path is resolved relative to the android/
                // root directory (where keystore.properties lives), so
                // the same string works whether you run gradle from the
                // android/ folder or from the repo root via gradlew.
                storeFile = rootProject.file(storePath)
                storePassword = keystoreProps.getProperty("storePassword")
                keyAlias      = keystoreProps.getProperty("keyAlias")
                keyPassword   = keystoreProps.getProperty("keyPassword")
            }
        }
    }

    // Two distribution channels:
    //   * `site` — APK hosted on tabletopforge.com. Ships an in-app
    //     update checker that polls /android/updates.json and side-
    //     loads new APKs through PackageInstaller.
    //   * `play` — Google Play build. No self-update code; updates
    //     are handled by the store itself. The `REQUEST_INSTALL_
    //     PACKAGES` permission is added only to the site manifest
    //     so Play doesn't reject the upload.
    flavorDimensions += "distribution"
    productFlavors {
        create("site") {
            dimension = "distribution"
            buildConfigField("Boolean", "ENABLE_OTA", "true")
            buildConfigField(
                "String", "UPDATE_MANIFEST_URL",
                "\"https://forge.giantmushroom.studio/android/updates.json\"",
            )
            // Suffix the version name so we can tell the two channels
            // apart in crash reports and on the Settings → Server row.
            versionNameSuffix = "-site"
        }
        create("play") {
            dimension = "distribution"
            buildConfigField("Boolean", "ENABLE_OTA", "false")
            buildConfigField("String", "UPDATE_MANIFEST_URL", "\"\"")
            versionNameSuffix = ""
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
            // Only attach the release signing config when we actually
            // loaded a keystore — otherwise gradle errors out on every
            // task that touches the release variant (e.g. lint).
            if (keystoreProps.getProperty("storeFile") != null) {
                signingConfig = signingConfigs.getByName("release")
            }
        }
        debug {
            // Local OTA loopback. Debug builds point at the host
            // machine's loopback alias (10.0.2.2 from the emulator)
            // so we can test the OTA flow against a Python HTTP
            // server without uploading every test APK to the public
            // site. Release builds keep the production URL set on
            // the site flavor above.
            buildConfigField(
                "String", "UPDATE_MANIFEST_URL",
                "\"http://10.0.2.2:8765/android/updates.json\"",
            )
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
    buildFeatures {
        compose = true
        // BuildConfig is opt-in on AGP 8+. We need it for the
        // ENABLE_OTA / UPDATE_MANIFEST_URL fields above.
        buildConfig = true
    }
    packaging {
        resources {
            excludes += "/META-INF/{AL2.0,LGPL2.1}"
        }
    }
}

dependencies {
    val composeBom = platform("androidx.compose:compose-bom:2024.09.00")
    implementation(composeBom)

    // Compose UI
    implementation("androidx.activity:activity-compose:1.9.2")
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.material:material-icons-extended")
    implementation("androidx.compose.runtime:runtime-livedata")
    implementation("androidx.navigation:navigation-compose:2.7.7")

    // Lifecycle / ViewModel
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.8.4")
    implementation("androidx.lifecycle:lifecycle-runtime-compose:2.8.4")

    // Coroutines
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.8.1")

    // Serialization (matches Swift Codable)
    implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.7.3")

    // HTTP — Ktor client (lighter than Retrofit + plays nicely with coroutines)
    implementation("io.ktor:ktor-client-core:2.3.12")
    implementation("io.ktor:ktor-client-okhttp:2.3.12")
    implementation("io.ktor:ktor-client-content-negotiation:2.3.12")
    implementation("io.ktor:ktor-serialization-kotlinx-json:2.3.12")

    // Socket.IO Android client — version range matches the iOS Socket.IO-Client-Swift contract.
    implementation("io.socket:socket.io-client:2.1.1") {
        exclude(group = "org.json", module = "json")
    }

    // Image loading (avatars + map thumbnails)
    implementation("io.coil-kt:coil-compose:2.7.0")

    // DataStore for SharedPreferences-style persistence
    implementation("androidx.datastore:datastore-preferences:1.1.1")

    debugImplementation("androidx.compose.ui:ui-tooling")
}
