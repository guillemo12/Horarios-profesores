package com.colegio.solver

import ai.timefold.solver.core.api.domain.solution.*
import ai.timefold.solver.core.api.domain.valuerange.ValueRangeProvider
import ai.timefold.solver.core.api.score.buildin.hardsoft.HardSoftScore
import com.colegio.DTO.Configuracion
import java.util.Collections.emptyList

@PlanningSolution
class HorarioSolution(
    // Todo va dentro de los paréntesis del constructor principal
    @ValueRangeProvider(id = "rangoDeHoras")
    @ProblemFactCollectionProperty
    var timeSlotList: List<TimeSlot> = emptyList(),

    @PlanningEntityCollectionProperty
    var lessonList: List<Leccion> = emptyList(),

    @ProblemFactProperty
    var configuracion: Configuracion? = null,

    @ValueRangeProvider(id = "rangoDeProfesores")
    @ProblemFactCollectionProperty
    var profesorList: List<Profesor> = emptyList(),
) {
    // La puntuación se queda sola en el cuerpo de la clase
    @PlanningScore
    var score: HardSoftScore? = null
}