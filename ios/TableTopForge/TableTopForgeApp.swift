import SwiftUI

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
        }
        #if os(macOS) || targetEnvironment(macCatalyst)
        .defaultSize(width: 480, height: 720)
        #endif
    }
}
