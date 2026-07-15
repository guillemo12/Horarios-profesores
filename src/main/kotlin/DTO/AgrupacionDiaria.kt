package com.colegio.DTO

import java.time.DayOfWeek

// Empaqueta 3 variables en 1 sola
data class AgrupacionDiaria(
    val grupo: String,
    val asignatura: String,
    val dia: DayOfWeek
)