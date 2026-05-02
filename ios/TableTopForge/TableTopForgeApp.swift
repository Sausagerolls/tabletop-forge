import SwiftUI

// TableTopForgeApp — @main entry. SwiftUI multiplatform target. The
// same WindowGroup ships to iPhone, iPad, and Mac (Designed-for-iPad).
// The Mac build needs a slightly larger default window than the iPad
// one; everything else is identical across destinations.
@main
struct TableTopForgeApp: App {
    var body: some Scene {
        WindowGroup {
            ContentView()
        }
        // Mac-only: pin a sane default window size so the app doesn't
        // open at iPhone-portrait dimensions on first launch. iPhone
        // and iPad ignore this modifier.
        #if os(macOS)
        .defaultSize(width: 480, height: 720)
        #endif
    }
}
