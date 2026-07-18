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
    val minutosSemanales:Int = 0
) {
    // La variable que Timefold va a mover se queda en el cuerpo de la clase
    @PlanningVariable(valueRangeProviderRefs = ["rangoDeHoras"])
    var timeSlot: TimeSlot? = null

    @PlanningVariable(valueRangeProviderRefs = ["rangoDeProfesores"])
    var profesor: Profesor? = null

}