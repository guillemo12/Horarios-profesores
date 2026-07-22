package com.colegio.DTO

import kotlinx.serialization.Serializable

@Serializable
data class CourseGroupDto(
    val id: String,
    val name: String,
    val tutorId: String,
    val assignments: Map<String, String> // subjectId -> teacherId
)

@Serializable
data class CourseDto(
    val id: String,
    val name: String,
    val subjects: List<String>,
    val groups: List<CourseGroupDto>
)
