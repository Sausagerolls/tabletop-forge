// UpdateBus — process-singleton holder for the OTA update state so
// the cold-launch check (in AppRoot) and the manual "Check for
// updates" button (in DiceLightScreen) share results without
// prop-drilling, and so the navigation bar can show a dot badge
// when an update is waiting.
//
// Compose's snapshot system is the right home for this even though
// it's a global — both consumers are Composables, and any non-
// Composable callers can `.value` directly.
package com.tabletopforge.services

import androidx.compose.runtime.mutableStateOf

object UpdateBus {
    /** The most recently discovered update — null when there's
     *  nothing newer than the running build, or when the OTA flow
     *  has been disabled (play flavor). */
    val available = mutableStateOf<AvailableUpdate?>(null)

    /** True while a fetch is in flight. Used by the manual check
     *  button to render a spinner and avoid double-fetching. */
    val checking = mutableStateOf(false)

    /** Last error from a failed check — null when the last attempt
     *  succeeded or none has run yet. */
    val lastError = mutableStateOf<String?>(null)

    /** Human-readable timestamp of the last completed check. */
    val lastCheckedAt = mutableStateOf<Long?>(null)
}
