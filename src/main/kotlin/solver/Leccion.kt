package com.colegio.solver

class Leccion(
    var id: String = "",
    var asignatura: String = "",
    var grupo: Grupo = Grupo(),
    val minutosSemanales: Int = 0,
    val profesorFijo: Profesor? = null
) {
    var isPinned: Boolean = false
    var timeSlot: TimeSlot? = null
    var profesor: Profesor? = null

    override fun toString(): String {
        val profeNombre = profesor?.nombre ?: "Sin profe"
        val diaHora = timeSlot?.let { "${it.dayOfWeek} a las franja ${it.indiceDeFranja}" } ?: "Sin hora"
        return "[${grupo.curso} ${grupo.nombre} - $asignatura con $profeNombre ($diaHora)]"
    }
}