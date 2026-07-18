package com.colegio.solver

data class Grupo(
    val curso: String = "",
    val nombre: String = "",
    val tutor: Profesor = Profesor("", listOf(), listOf()),
)