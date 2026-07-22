package com.colegio.solver

import com.colegio.DTO.TeacherAvailabilityDto

data class Profesor(
    val nombre: String,
    val asignaturas: List<String>,
    val asignaturasPreferidas: List<String>,
    val minutosMaximos: Int,
    val availability: List<TeacherAvailabilityDto> = emptyList()
)