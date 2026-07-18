package com.colegio.solver

import com.colegio.Constantes.minutosMaximosProfesor

data class Grupo(
    val curso: String = "",
    val nombre: String = "",
    val tutor: Profesor = Profesor("", listOf(), listOf(), minutosMaximosProfesor),
)