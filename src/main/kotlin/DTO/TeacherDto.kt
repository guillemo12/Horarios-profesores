package com.colegio.DTO

import kotlinx.serialization.Serializable

@Serializable
data class TeacherDto(
    val id: String,
    val name: String,
    val maxHours: Double,
    val color: String,
    val subjects: List<String>,
    val availability: List<TeacherAvailabilityDto> = emptyList()
)
