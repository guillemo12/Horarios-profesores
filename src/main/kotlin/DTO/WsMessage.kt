package com.colegio.DTO

import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonElement

@Serializable
data class WsMessage(
    val command: String,
    val payload: JsonElement? = null
)
