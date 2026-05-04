// Android settings — single-module project. The SDK lives on the
// external SSD; the path comes from local.properties (gitignored)
// or the ANDROID_HOME env var.
pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
        // Socket.IO for Android — published on JitPack since the
        // socket.io-client-java repo doesn't push to Maven Central.
        maven { url = uri("https://jitpack.io") }
    }
}
rootProject.name = "TableTopForge"
include(":app")
