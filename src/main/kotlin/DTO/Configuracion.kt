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
    val compactarTempranoPuntos: Int = 5,
    
    // Rango horario y recreo
    val horaInicioClases: String = "09:00",
    val horaFinClases: String = "14:00",
    val horaInicioRecreo: String = "12:00",
    val duracionRecreo: Int = 30,

    // Reglas duras
    val respetarEspecialidad: Boolean = true,
    val respetarLimiteHoras: Boolean = true,
    val respetarDisponibilidad: Boolean = true
)
