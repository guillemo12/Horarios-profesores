package com.colegio.DTO

import kotlinx.serialization.Serializable

@Serializable
data class Configuracion(
    val priorizarTutor: Boolean = true,
    val tiempoMinimo: Int = 30,
    val tiempoMaximo: Int = 60,
    val minutosMaximosProfesor: Int = 1500,
    val priorizarTutorPuntos: Int = 100,
    val fomentarBloques60Puntos: Int = 10,
    val evitarHuecosPuntos: Int = 50,
    val compactarTempranoPuntos: Int = 5
)
