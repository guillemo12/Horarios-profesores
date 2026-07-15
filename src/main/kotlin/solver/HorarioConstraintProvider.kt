package com.colegio.solver

import ai.timefold.solver.core.api.domain.solution.PlanningEntityCollectionProperty
import ai.timefold.solver.core.api.domain.solution.PlanningScore
import ai.timefold.solver.core.api.domain.solution.PlanningSolution
import ai.timefold.solver.core.api.domain.solution.ProblemFactCollectionProperty
import ai.timefold.solver.core.api.domain.valuerange.ValueRangeProvider
import ai.timefold.solver.core.api.score.buildin.hardsoft.HardSoftScore
import ai.timefold.solver.core.api.score.stream.Constraint
import ai.timefold.solver.core.api.score.stream.ConstraintFactory
import ai.timefold.solver.core.api.score.stream.ConstraintProvider
import ai.timefold.solver.core.api.score.stream.Joiners
import java.util.Collections.emptyList

class HorarioConstraintProvider : ConstraintProvider {

    override fun defineConstraints(factory: ConstraintFactory): Array<Constraint> {
        return arrayOf(
            profesorConflicto(factory),
            grupoConflicto(factory)
            // Aquí irías añadiendo más reglas: horas máximas al día, guardias, etc.
        )
    }

    // Regla HARD 1: Un profesor no puede dar dos clases distintas en la misma franja horaria.
    private fun profesorConflicto(factory: ConstraintFactory): Constraint {
        return factory.forEachUniquePair(
            Leccion::class.java,
            // Si dos sesiones ocurren en el mismo hueco de tiempo...
            Joiners.equal(Leccion::timeSlot),
            // ...y el profesor es el mismo...
            Joiners.equal(Leccion::profesor)
        )
            // ...entonces penalizamos duramente este horario.
            .penalize( HardSoftScore.ONE_HARD)
            .asConstraint("Conflicto de profesor")
    }

    // Regla HARD 2: Un grupo de alumnos (ej. 1ºA) no puede tener dos asignaturas a la vez.
    private fun grupoConflicto(factory: ConstraintFactory): Constraint {
        return factory.forEachUniquePair(
            Leccion::class.java,
            Joiners.equal(Leccion::timeSlot),
            Joiners.equal(Leccion::grupo)
        )
            .penalize( HardSoftScore.ONE_HARD)
            .asConstraint("Conflicto de grupo")
    }
}