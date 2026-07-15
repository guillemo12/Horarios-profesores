package com.colegio.solver

import ai.timefold.solver.core.api.score.buildin.hardsoft.HardSoftScore
import ai.timefold.solver.core.api.score.stream.Constraint
import ai.timefold.solver.core.api.score.stream.ConstraintFactory
import ai.timefold.solver.core.api.score.stream.ConstraintProvider
import ai.timefold.solver.core.api.score.stream.Joiners

class HorarioConstraintProvider : ConstraintProvider {

    override fun defineConstraints(factory: ConstraintFactory): Array<Constraint> {
        return arrayOf(
            profesorConflicto(factory),
            grupoConflicto(factory)
            // Aquí irías añadiendo más reglas: horas máximas al día, guardias, etc.
        )
    }

    // Regla Soft: Se busca que haya 1 hora de cada asignatura
    private fun fomentarBloquesDe60Minutos(factory: ConstraintFactory): Constraint {
        return factory.forEach(Leccion::class.java)
            // CRUZAMOS la lección consigo misma para buscar "parejas"
            .join(Leccion::class.java,
                Joiners.equal(Leccion::grupo),
                Joiners.equal(Leccion::asignatura),
                Joiners.equal { leccion -> leccion.timeSlot?.dayOfWeek }
            )
            // CONDICIÓN: La lección 2 debe ir EXACTAMENTE un hueco después de la lección 1
            .filter { leccion1, leccion2 ->
                val indice1 = leccion1.timeSlot!!.indiceDeFranja
                val indice2 = leccion2.timeSlot!!.indiceDeFranja
                indice2 == indice1 + 1
            }
            // PREMIO: ¡Bien hecho IA! Has juntado 60 minutos. Te doy 10 puntos.
            .reward(HardSoftScore.ofSoft(10))
            .asConstraint("Fomentar bloques de 60 minutos")
    }

    private fun prohibirBloquesDe90Minutos(factory: ConstraintFactory): Constraint {
        return factory.forEach(Leccion::class.java)
            // Buscamos la pareja (60 mins)
            .join(Leccion::class.java,
                Joiners.equal(Leccion::grupo),
                Joiners.equal(Leccion::asignatura),
                Joiners.equal { leccion -> leccion.timeSlot?.dayOfWeek }
            )
            .filter { l1, l2 -> l2.timeSlot!!.indiceDeFranja == l1.timeSlot!!.indiceDeFranja + 1 }

            // ¡DOBLE CRUCE! Añadimos una tercera lección a la ecuación para buscar el "trío"
            // ¡DOBLE CRUCE! Añadimos una tercera lección a la ecuación para buscar el "trío"
            .join(Leccion::class.java,
                // Compara el grupo de l1 con el grupo de la nueva lección (l3)
                Joiners.equal({ l1, l2 -> l1.grupo }, Leccion::grupo),
                // Compara la asignatura de l1 con la asignatura de la nueva lección (l3)
                Joiners.equal({ l1, l2 -> l1.asignatura }, Leccion::asignatura),
                // Compara el día de l1 con el día de la nueva lección (usamos lambda por el '?')
                Joiners.equal({ l1, l2 -> l1.timeSlot?.dayOfWeek }, { l3 -> l3.timeSlot?.dayOfWeek })
            )
            // CONDICIÓN: La lección 3 va justo después de la lección 2 (90 minutos seguidos)
            .filter { l1, l2, l3 -> l3.timeSlot!!.indiceDeFranja == l2.timeSlot!!.indiceDeFranja + 1 }
            // CASTIGO SEVERO: Si haces esto, el horario es inválido.
            .penalize(HardSoftScore.ONE_HARD)
            .asConstraint("Prohibir 3 clases seguidas (90 minutos)")
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
            .penalize(HardSoftScore.ONE_HARD)
            .asConstraint("Conflicto de profesor")
    }

    // Regla HARD 2: Un grupo de alumnos (ej. 1ºA) no puede tener dos asignaturas a la vez.
    private fun grupoConflicto(factory: ConstraintFactory): Constraint {
        return factory.forEachUniquePair(
            Leccion::class.java,
            Joiners.equal(Leccion::timeSlot),
            Joiners.equal(Leccion::grupo)
        )
            .penalize(HardSoftScore.ONE_HARD)
            .asConstraint("Conflicto de grupo")
    }
}