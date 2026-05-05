// UpdateChecker — site-flavor OTA update flow. Polls a JSON manifest
// hosted alongside the APK on tabletopforge.com, downloads the new
// APK to external cache, verifies a SHA-256 hash, and hands it off
// to the system PackageInstaller via a FileProvider intent.
//
// Disabled at compile time on the `play` flavor via BuildConfig.
// ENABLE_OTA — the UI never shows an update prompt and no manifest
// fetch ever runs in that build.
package com.tabletopforge.services

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import androidx.core.content.FileProvider
import com.tabletopforge.BuildConfig
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import java.io.File
import java.net.HttpURLConnection
import java.net.URL
import java.security.MessageDigest

/** What the manifest at UPDATE_MANIFEST_URL must look like.
 *  Released alongside each APK on the site. Compared against the
 *  in-process BuildConfig.VERSION_CODE; the user is prompted only
 *  when [version_code] is strictly greater. */
@Serializable
data class UpdateManifest(
    val version_code: Int,
    val version_name: String,
    val url: String,
    val sha256: String,
    val release_notes: String = "",
    val released_at: String = "",
    val min_supported_version_code: Int = 0,
)

/** Result of [UpdateChecker.check] — populated only when there's
 *  actually a newer APK available. */
data class AvailableUpdate(
    val manifest: UpdateManifest,
    val installedVersionName: String,
    val installedVersionCode: Int,
)

class UpdateChecker(private val context: Context) {

    private val json = Json { ignoreUnknownKeys = true }

    /** True for the `site` build, false for `play`. The flavor
     *  flips this at compile time so the play build never ships any
     *  OTA-checking code paths. */
    val enabled: Boolean = BuildConfig.ENABLE_OTA

    /** Fetch the manifest and compare it against the running build.
     *  Returns null if disabled, offline, manifest malformed, or
     *  the running build is already up-to-date. */
    suspend fun check(): AvailableUpdate? {
        if (!enabled) return null
        val manifestUrl = BuildConfig.UPDATE_MANIFEST_URL
        if (manifestUrl.isBlank()) return null

        val manifest = withContext(Dispatchers.IO) {
            runCatching {
                val u = URL(manifestUrl)
                val text = (u.openConnection() as HttpURLConnection).run {
                    connectTimeout = 6000; readTimeout = 6000
                    inputStream.bufferedReader().use { it.readText() }
                        .also { disconnect() }
                }
                json.decodeFromString(UpdateManifest.serializer(), text)
            }.getOrNull()
        } ?: return null

        val running = BuildConfig.VERSION_CODE
        if (manifest.version_code <= running) return null
        return AvailableUpdate(
            manifest = manifest,
            installedVersionName = BuildConfig.VERSION_NAME,
            installedVersionCode = running,
        )
    }

    /** Stream the APK to the external cache and return its file
     *  handle. Reports progress 0.0 → 1.0 to the supplied callback
     *  so the UI can render a bar. */
    suspend fun download(
        update: AvailableUpdate,
        onProgress: (Float) -> Unit,
    ): File = withContext(Dispatchers.IO) {
        val manifest = update.manifest
        val outDir = context.externalCacheDir ?: context.cacheDir
        val out = File(outDir, "tabletopforge-${manifest.version_code}.apk")
        // Force a redownload on every run — the file is short-lived
        // and we'd rather burn ~30 MB of network than ship a half-
        // written APK from a previous interrupted attempt.
        if (out.exists()) out.delete()

        val conn = URL(manifest.url).openConnection() as HttpURLConnection
        conn.connectTimeout = 10000
        conn.readTimeout = 30000
        conn.connect()
        val total = conn.contentLengthLong.coerceAtLeast(1L)

        conn.inputStream.use { input ->
            out.outputStream().use { output ->
                val buf = ByteArray(64 * 1024)
                var read: Int
                var soFar = 0L
                while (input.read(buf).also { read = it } > 0) {
                    output.write(buf, 0, read)
                    soFar += read
                    onProgress((soFar.toFloat() / total.toFloat()).coerceIn(0f, 1f))
                }
            }
        }
        conn.disconnect()

        // Hash check before we hand it to the installer. A
        // mismatch here means the manifest and the APK are out of
        // sync (or someone tampered en route) — either way we
        // refuse to install.
        val computed = sha256(out)
        if (!computed.equals(manifest.sha256, ignoreCase = true)) {
            out.delete()
            error("Downloaded APK failed hash check (expected ${manifest.sha256}, got $computed)")
        }
        out
    }

    /** Hand the APK off to the system installer. The user gets the
     *  Play Protect / unknown-sources permission prompt, then the
     *  install confirmation. We don't try to silently install — that
     *  would need a system-level signing key we don't have. */
    fun install(apk: File) {
        // On API 26+ the "install unknown apps" permission is per-
        // source. If it's not granted yet, point the user straight
        // at the system settings screen for our app — coming back
        // after granting will surface the install dialog on the
        // next attempt.
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O &&
            !context.packageManager.canRequestPackageInstalls()) {
            val settings = Intent(android.provider.Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                Uri.parse("package:${context.packageName}"))
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            context.startActivity(settings)
            return
        }
        val authority = "${context.packageName}.fileprovider"
        val uri: Uri = FileProvider.getUriForFile(context, authority, apk)
        val intent = Intent(Intent.ACTION_VIEW).apply {
            setDataAndType(uri, "application/vnd.android.package-archive")
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        context.startActivity(intent)
    }

    private fun sha256(file: File): String {
        val md = MessageDigest.getInstance("SHA-256")
        file.inputStream().use { input ->
            val buf = ByteArray(64 * 1024)
            var read: Int
            while (input.read(buf).also { read = it } > 0) {
                md.update(buf, 0, read)
            }
        }
        return md.digest().joinToString("") { "%02x".format(it) }
    }
}
