package com.colegio.solver

import ai.timefold.solver.core.api.domain.entity.PlanningEntity
import ai.timefold.solver.core.api.domain.lookup.PlanningId
import ai.timefold.solver.core.api.domain.variable.PlanningVariable

@PlanningEntity
class Leccion(
    // Todos tus datos fijos van al constructor principal con valores por defecto
    @PlanningId
    var id: String = "",
    var asignatura: String = "",
    var grupo: Grupo = Grupo(),
    val minutosSemanales:Int = 0,
    val profesorFijo: Profesor? = null
) {
    // La variable que Timefold va a mover se queda en el cuerpo de la clase
    @PlanningVariable(valueRangeProviderRefs = ["rangoDeHoras"])
    var timeSlot: TimeSlot? = null

    @PlanningVariable(valueRangeProviderRefs = ["rangoDeProfesores"])
    var profesor: Profesor? = null

    override fun toString(): String {
        val profeNombre = profesor?.nombre ?: "Sin profe"
        val diaHora = timeSlot?.let { "${it.dayOfWeek} a las franja ${it.indiceDeFranja}" } ?: "Sin hora"
        // Añade el curso.nombre para que se vea claro: "4º B - Inglés"
        return "[${grupo.curso} ${grupo.nombre} - $asignatura con $profeNombre ($diaHora)]"
    }
}