// ApiClient — Kotlin mirror of ios/TableTopForge/Services/APIClient.swift.
// REST helper for fetch-by-id reads and creature-sheet PUTs.

package com.tabletopforge.services

import com.tabletopforge.data.AppJson
import com.tabletopforge.data.Creature
import io.ktor.client.HttpClient
import io.ktor.client.engine.okhttp.OkHttp
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.client.request.get
import io.ktor.client.request.put
import io.ktor.client.request.setBody
import io.ktor.client.statement.bodyAsText
import io.ktor.http.ContentType
import io.ktor.http.contentType
import io.ktor.http.isSuccess
import io.ktor.serialization.kotlinx.json.json

class ApiClient(private val baseUrl: String) {
    private val http = HttpClient(OkHttp) {
        install(ContentNegotiation) { json(AppJson) }
    }

    suspend fun fetchCreature(id: Int): Creature {
        val res = http.get("$baseUrl/api/creatures/$id")
        if (!res.status.isSuccess()) {
            throw ApiException(res.status.value, res.bodyAsText())
        }
        return AppJson.decodeFromString(res.bodyAsText())
    }

    suspend fun patchCreature(id: Int, updates: Map<String, Any?>): Creature {
        val body = AppJson.encodeToString(
            kotlinx.serialization.json.JsonObject.serializer(),
            kotlinx.serialization.json.JsonObject(
                updates.mapValues { (_, v) -> jsonValueOf(v) }
            )
        )
        val res = http.put("$baseUrl/api/creatures/$id") {
            contentType(ContentType.Application.Json)
            setBody(body)
        }
        if (!res.status.isSuccess()) {
            throw ApiException(res.status.value, res.bodyAsText())
        }
        return AppJson.decodeFromString(res.bodyAsText())
    }

    private fun jsonValueOf(v: Any?): kotlinx.serialization.json.JsonElement = when (v) {
        null -> kotlinx.serialization.json.JsonNull
        is Number -> kotlinx.serialization.json.JsonPrimitive(v)
        is Boolean -> kotlinx.serialization.json.JsonPrimitive(v)
        is String -> kotlinx.serialization.json.JsonPrimitive(v)
        else -> kotlinx.serialization.json.JsonPrimitive(v.toString())
    }
}

class ApiException(val statusCode: Int, val responseBody: String) :
    RuntimeException("Server $statusCode: $responseBody")
