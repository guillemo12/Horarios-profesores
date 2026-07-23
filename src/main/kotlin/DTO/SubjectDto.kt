package com.colegio.DTO

import kotlinx.serialization.Serializable

@Serializable
data class SubjectDto(
    val id: String? = null,
    val name: String,
    val hours: Double,
    val courseId: String,
    val teachers: List<String> = emptyList()
)
