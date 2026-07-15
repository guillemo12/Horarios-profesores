package com.colegio.solver

import ai.timefold.solver.core.api.domain.solution.PlanningEntityCollectionProperty
import ai.timefold.solver.core.api.domain.solution.PlanningScore
import ai.timefold.solver.core.api.domain.solution.PlanningSolution
import ai.timefold.solver.core.api.domain.solution.ProblemFactCollectionProperty
import ai.timefold.solver.core.api.domain.solution.ProblemFactProperty
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
    var configuracion: Configuracion? = null
) {
    // La puntuación se queda sola en el cuerpo de la clase
    @PlanningScore
    var score: HardSoftScore? = null
}