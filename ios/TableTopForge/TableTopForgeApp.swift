import SwiftUI
#if targetEnvironment(macCatalyst)
import UIKit
#endif

// TableTopForgeApp — @main entry. SwiftUI multiplatform target. The
// same WindowGroup ships to iPhone, iPad, and Mac via Mac Catalyst.
// Mac Catalyst surfaces a resizable AppKit-backed window so the
// modifier below pins a sane default size (the iPhone/iPad
// destinations ignore it). os(macOS) covers a future native AppKit
// build; targetEnvironment(macCatalyst) covers the current one.
@main
struct TableTopForgeApp: App {
    var body: some Scene {
        WindowGroup {
            ContentView()
                .onAppear { hideMacCatalystWindowChrome() }
        }
        #if os(macOS) || targetEnvironment(macCatalyst)
        .defaultSize(width: 480, height: 720)
        #endif
    }
}

/// On Mac Catalyst, hide the window's titlebar entirely.
///
/// Two reasons:
///
/// 1. The bundle display name ("TT Forge") was rendering as the
///    Mac window title. The in-app tab bar already names every
///    screen — the window-level title is redundant chrome that
///    just clutters the top of the window.
/// 2. Mac Catalyst auto-populates the titlebar's toolbar with
///    back / forward chevrons that mirror the SwiftUI navigation
///    stack. They're disorienting in a TabView-driven app
///    because tabs aren't a navigation stack — pressing them
///    doesn't go "back" to a previous screen, it just bounces
///    between unrelated tabs. Killing the toolbar removes the
///    misleading affordance.
///
/// The titlebar is created lazily by Catalyst so we set this on
/// every connected scene rather than guessing which one is the
/// front window. No-op on iPhone / iPad / pure macOS.
private func hideMacCatalystWindowChrome() {
    #if targetEnvironment(macCatalyst)
    for scene in UIApplication.shared.connectedScenes {
        guard let windowScene = scene as? UIWindowScene,
              let titlebar = windowScene.titlebar else { continue }
        titlebar.titleVisibility = .hidden
        titlebar.toolbar = nil
        // Without `.unified`, the gap that the now-hidden toolbar
        // used to occupy still rendered as a hairline strip above
        // the content. Unified style merges the titlebar into the
        // window so the content goes edge-to-edge.
        titlebar.toolbarStyle = .unified
    }
    #endif
}
