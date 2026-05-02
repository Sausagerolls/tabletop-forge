import Foundation
import UserNotifications

// NotificationManager — wraps UNUserNotificationCenter for whispers.
// First call requests permission; thereafter we just deliver. If the
// user denied permission, we silently drop the notification — the
// whisper still appears in the Stats tab's whisper log either way.
final class NotificationManager {
    static let shared = NotificationManager()

    private var requested = false
    private var granted = false

    private func ensurePermission() async {
        if requested { return }
        requested = true
        let center = UNUserNotificationCenter.current()
        do {
            granted = try await center.requestAuthorization(options: [.alert, .sound, .badge])
        } catch {
            granted = false
        }
    }

    func deliver(title: String, body: String) {
        Task {
            await ensurePermission()
            guard granted else { return }
            let content = UNMutableNotificationContent()
            content.title = title
            content.body = body
            content.sound = .default
            // Immediate delivery — trigger=nil = "as soon as possible".
            let req = UNNotificationRequest(identifier: UUID().uuidString, content: content, trigger: nil)
            try? await UNUserNotificationCenter.current().add(req)
        }
    }
}
