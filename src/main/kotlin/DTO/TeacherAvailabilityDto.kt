package com.colegio.DTO

import kotlinx.serialization.Serializable

@Serializable
data class TeacherAvailabilityDto(
    val dayOfWeek: Int,       // 1 (Lunes) a 5 (Viernes)
    val startTime: String,    // "09:00"
    val endTime: String       // "10:30"
)
