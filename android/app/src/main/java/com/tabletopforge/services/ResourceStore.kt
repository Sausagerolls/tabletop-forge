// ResourceStore — DataStore-backed counter for class resource usage.
//
// Keys: "vtt.res.<creatureId>.<resourceId>" → Int (used count).
// Local-only by design — the GM doesn't typically need a live readout
// of "how many sorcery points has the sorcerer spent". When server-
// side parity is wanted later, swap the read/write paths to hit
// /api/creatures/:id/{resource patch} or a plugin KV.

package com.tabletopforge.services

import android.content.Context
import androidx.compose.runtime.MutableState
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateMapOf
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.intPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch

private val Context.resourceDataStore by preferencesDataStore(name = "vtt-resources")

class ResourceStore(private val ctx: Context, private val scope: CoroutineScope) {
    // creatureId+resourceId → MutableState<Int> the UI reads. We keep
    // them in a snapshot map so each row recomposes independently.
    private val cache = mutableStateMapOf<String, MutableState<Int>>()

    private fun key(creatureId: Int, resourceId: String) = "vtt.res.$creatureId.$resourceId"

    /** Bind the UI counter for a (creature, resource). Hydrates from
     *  DataStore on first access; subsequent reads come straight from
     *  the in-memory state.  */
    fun used(creatureId: Int, resourceId: String): MutableState<Int> {
        val k = key(creatureId, resourceId)
        return cache.getOrPut(k) {
            val initial = mutableIntStateOf(0)
            scope.launch {
                val prefs = ctx.resourceDataStore.data.first()
                initial.value = prefs[intPreferencesKey(k)] ?: 0
            }
            initial
        }
    }

    fun setUsed(creatureId: Int, resourceId: String, value: Int) {
        val state = used(creatureId, resourceId)
        state.value = value.coerceAtLeast(0)
        scope.launch(Dispatchers.IO) {
            ctx.resourceDataStore.edit { p ->
                p[intPreferencesKey(key(creatureId, resourceId))] = state.value
            }
        }
    }

    fun bump(creatureId: Int, resourceId: String, delta: Int, max: Int) {
        val state = used(creatureId, resourceId)
        val next = (state.value + delta).coerceIn(0, max.coerceAtLeast(0))
        if (next == state.value) return
        setUsed(creatureId, resourceId, next)
    }

    /** Wipe every resource counter for a given creature. Used when the
     *  player long-rests and wants to reset everything in one go. */
    fun resetAll(creatureId: Int) {
        scope.launch(Dispatchers.IO) {
            ctx.resourceDataStore.edit { p ->
                val keys = p.asMap().keys.filter { it.name.startsWith("vtt.res.$creatureId.") }
                for (k in keys) p.remove(k)
            }
        }
        // Optimistic local clear.
        for ((k, st) in cache) {
            if (k.startsWith("vtt.res.$creatureId.")) st.value = 0
        }
    }
}
