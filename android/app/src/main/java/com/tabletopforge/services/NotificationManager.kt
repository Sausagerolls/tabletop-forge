// NotificationManager — Kotlin mirror of ios/TableTopForge/Services/NotificationManager.swift.
// Surfaces incoming whispers + "you've been targeted" alerts via the
// system notification tray. POST_NOTIFICATIONS is a runtime grant on
// API 33+; the request flow is owned by MainActivity.

package com.tabletopforge.services

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import androidx.core.app.NotificationCompat

object Notifier {
    private const val CHANNEL_ID = "tabletopforge.alerts"

    fun ensureChannel(ctx: Context) {
        val mgr = ctx.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        if (mgr.getNotificationChannel(CHANNEL_ID) != null) return
        val ch = NotificationChannel(
            CHANNEL_ID, "Game Alerts", NotificationManager.IMPORTANCE_HIGH,
        ).apply {
            description = "Whispers and targeted-by-GM alerts."
        }
        mgr.createNotificationChannel(ch)
    }

    fun show(ctx: Context, id: Int, title: String, body: String) {
        val n = NotificationCompat.Builder(ctx, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle(title)
            .setContentText(body)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .build()
        (ctx.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager)
            .notify(id, n)
    }
}
