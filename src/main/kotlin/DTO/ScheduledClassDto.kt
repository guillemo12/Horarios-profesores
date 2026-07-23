package com.colegio.DTO

import kotlinx.serialization.Serializable

@Serializable
data class ScheduledClassDto(
    val id: String? = null,
    val start: String,
    val end: String,
    val duration: Double,
    val subjectId: String,
    val groupId: String,
    val teacherId: String,
    val isPinned: Boolean
)
