package com.colegio.solver

import ai.timefold.solver.core.api.score.buildin.hardsoft.HardSoftScore
import ai.timefold.solver.core.api.score.stream.Constraint
import ai.timefold.solver.core.api.score.stream.ConstraintCollectors
import ai.timefold.solver.core.api.score.stream.ConstraintFactory
import ai.timefold.solver.core.api.score.stream.ConstraintProvider
import ai.timefold.solver.core.api.score.stream.Joiners
import com.colegio.DTO.AgrupacionDiaria
import com.colegio.DTO.Configuracion
import java.time.DayOfWeek

class HorarioConstraintProvider : ConstraintProvider {

    override fun defineConstraints(factory: ConstraintFactory): Array<Constraint> {
        return arrayOf(
            profesorConflicto(factory),
            grupoConflicto(factory),
            // Aquí irías añadiendo más reglas: horas máximas al día, guardias, etc.
            fomentarBloquesDe60Minutos(factory),
            limiteMaximoMinutosPorDia(factory),
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


    private fun limiteMaximoMinutosPorDia(factory: ConstraintFactory): Constraint {
        return factory.forEach(Leccion::class.java)
            // 1. Filtramos las lecciones que ya tienen hora asignada
            .filter { leccion -> leccion.timeSlot != null }

            // 2. AGRUPACIÓN COMPACTA
            // Creamos nuestro paquete "AgrupacionDiaria" sobre la marcha. Esto cuenta como 1 sola variable.
            .groupBy(
                { leccion -> AgrupacionDiaria(leccion.grupo, leccion.asignatura, leccion.timeSlot!!.dayOfWeek) },
                // Sumamos los minutos. Esto cuenta como la 2ª variable.
                ConstraintCollectors.sum { leccion -> leccion.timeSlot!!.duracionMinutos }
            )

            // 3. CRUZAMOS con los ajustes.
            // Se añade como la 3ª variable. ¡Estamos muy por debajo del límite de 4!
            .join(Configuracion::class.java)

            // 4. LA REGLA DINÁMICA
            // Parámetros: (llave empaquetada, total de minutos, ajustes de SQLite)
            .filter { llave, minutosTotales, ajustes ->
                minutosTotales > ajustes.tiempoMaximo
            }

            // 5. PENALIZACIÓN
            .penalize(
                HardSoftScore.ONE_HARD,
                { llave, minutosTotales, ajustes ->
                    minutosTotales - ajustes.tiempoMaximo
                }
            )
            .asConstraint("Exceso de minutos de una asignatura en un mismo día")
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