package com.colegio.solver

import ai.timefold.solver.core.api.score.buildin.hardsoft.HardSoftScore
import ai.timefold.solver.core.api.score.stream.*
import com.colegio.DTO.AgrupacionDiaria
import com.colegio.DTO.Configuracion

class HorarioConstraintProvider : ConstraintProvider {

    override fun defineConstraints(factory: ConstraintFactory): Array<Constraint> {
        return arrayOf(
            profesorConflicto(factory),
            grupoConflicto(factory),
            // Aquí irías añadiendo más reglas: horas máximas al día, guardias, etc.
            fomentarBloquesDe60Minutos(factory),
            limiteMaximoMinutosPorDia(factory),
            evitarHuecosLibres(factory),
            compactarTemprano(factory),
            priorizarTutorDelGrupo(factory),
            profesorMateriaIncorrecta(factory),
        )
    }

    // Regla HARD: El profesor asignado TIENE que saber dar esa asignatura
    private fun profesorMateriaIncorrecta(factory: ConstraintFactory): Constraint {
        return factory.forEach(Leccion::class.java)
            // Filtramos las lecciones a las que la IA ya les ha puesto profesor
            .filter { leccion -> leccion.profesor != null }
            // CONDICIÓN: ¿La asignatura de esta lección NO ESTÁ en la lista de asignaturas del profesor?
            .filter { leccion -> !leccion.profesor!!.asignaturas.contains(leccion.asignatura) }
            // Castigamos severamente: Opción prohibida
            .penalize(HardSoftScore.ONE_HARD)
            .asConstraint("El profesor no tiene la especialidad para esta materia")
    }

    // Regla Soft: Evitar huecos libres intermedios para los grupos
    private fun evitarHuecosLibres(factory: ConstraintFactory): Constraint {
        return factory.forEach(Leccion::class.java)
            .filter { leccion -> leccion.timeSlot != null }
            .groupBy(
                // Empaquetamos Grupo y Día en una sola variable (Pair) para no exceder los límites
                { leccion -> Pair(leccion.grupo, leccion.timeSlot!!.dayOfWeek) },
                // Extraemos el primer hueco, el último hueco, y la cantidad real de clases
                ConstraintCollectors.min { leccion -> leccion.timeSlot!!.indiceDeFranja },
                ConstraintCollectors.max { leccion -> leccion.timeSlot!!.indiceDeFranja },
                ConstraintCollectors.count()
            )
            .filter { _, minIndice, maxIndice, cantidad ->
                // Calculamos cuántas franjas abarca en total (ej: de la franja 0 a la 3 son 4 franjas)
                val min = minIndice ?: 0
                val max = maxIndice ?: 0
                val franjasAbarcadas = (max - min) + 1

                // Si abarca más franjas que clases reales tiene, significa que hay huecos en medio
                franjasAbarcadas > cantidad
            }
            // Penalizamos severamente (10 puntos) por cada hora muerta que haya en medio
            .penalize(HardSoftScore.ofSoft(10)) { _, minIndice, maxIndice, cantidad ->
                val min = minIndice ?: 0
                val max = maxIndice ?: 0
                val franjasAbarcadas = (max - min) + 1

                val huecos = franjasAbarcadas - cantidad
                huecos.toInt()
            }
            .asConstraint("Evitar huecos libres intermedios")
    }

    // Regla Soft: Preferir colocar las clases lo más temprano posible (Efecto gravedad)
    private fun compactarTemprano(factory: ConstraintFactory): Constraint {
        return factory.forEach(Leccion::class.java)
            .filter { leccion -> leccion.timeSlot != null }
            // Penalizamos multiplicando por el índice de la franja.
            // Una clase a las 09:00 (índice 0) tiene 0 penalización.
            // Una a las 11:30 (índice 5) recibirá 5 puntos negativos.
            .penalize(HardSoftScore.ONE_SOFT) { leccion ->
                leccion.timeSlot!!.indiceDeFranja
            }
            .asConstraint("Compactar horario por la mañana")
    }

    private fun priorizarTutorDelGrupo(factory: ConstraintFactory): Constraint {
        return factory.forEach(Leccion::class.java)
            // 1. Filtramos para evaluar solo las lecciones a las que la IA ya les ha puesto un profe
            .filter { leccion -> leccion.profesor != null }

            // 2. LA CONDICIÓN: ¿El profe que ha elegido la IA es el tutor de este grupo exacto?
            .filter { leccion -> leccion.profesor?.equals(leccion.grupo.tutor) == true }

            // 3. EL PREMIO: Le damos 100 puntos Soft.
            // La IA se volverá "adicta" a emparejar a los tutores con sus clases para ganar más puntos.
            .reward(HardSoftScore.ofSoft(100))

            .asConstraint("Priorizar que el tutor dé clase a su grupo")
    }

    // Regla Soft: Se busca que haya 1 hora de cada asignatura
    private fun fomentarBloquesDe60Minutos(factory: ConstraintFactory): Constraint {
        return factory.forEach(Leccion::class.java)
            // CRUZAMOS la lección consigo misma para buscar "parejas"
            .join(
                Leccion::class.java,
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
                { leccion -> AgrupacionDiaria(leccion.grupo.nombre, leccion.asignatura, leccion.timeSlot!!.dayOfWeek) },
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