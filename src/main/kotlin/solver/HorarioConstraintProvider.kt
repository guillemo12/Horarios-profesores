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
            fomentarBloquesDe60Minutos(factory),
            limiteMaximoMinutosPorDia(factory),
            evitarHuecosLibres(factory),
            compactarTemprano(factory),
            priorizarTutorDelGrupo(factory),
            profesorMateriaIncorrecta(factory),
            limiteHorasProfesor(factory),
            profesorUnicoPorMateriaYGrupo(factory),
            respetarProfesorFijo(factory),
            profesorDisponible(factory),
        )
    }

    // Regla HARD: Un profesor único por asignatura y grupo
    private fun profesorUnicoPorMateriaYGrupo(factory: ConstraintFactory): Constraint {
        return factory.forEachUniquePair(
            Leccion::class.java,
            Joiners.equal(Leccion::grupo),
            Joiners.equal(Leccion::asignatura)
        )
        .filter { leccion1, leccion2 ->
            leccion1.profesor != null &&
                    leccion2.profesor != null &&
                    leccion1.profesor!!.nombre != leccion2.profesor!!.nombre
        }
        .penalize(HardSoftScore.ONE_HARD)
        .asConstraint("Un solo profesor por asignatura y grupo")
    }

    // Regla HARD: Si la lección tiene un profesor preasignado, la IA no puede cambiarlo
    private fun respetarProfesorFijo(factory: ConstraintFactory): Constraint {
        return factory.forEach(Leccion::class.java)
            .filter { leccion -> leccion.profesorFijo != null }
            .filter { leccion -> leccion.profesor != null && leccion.profesor != leccion.profesorFijo }
            .penalize(HardSoftScore.ONE_HARD)
            .asConstraint("Respetar asignación manual de profesor")
    }

    // Regla HARD: Un profesor no puede exceder su límite de horas semanales (Dinamizado con Config)
    private fun limiteHorasProfesor(factory: ConstraintFactory): Constraint {
        return factory.forEach(Leccion::class.java)
            .filter { leccion -> leccion.profesor != null && leccion.timeSlot != null }
            .groupBy(
                { leccion -> leccion.profesor!! },
                ConstraintCollectors.sum { leccion -> leccion.timeSlot!!.duracionMinutos }
            )
            .filter { profesor, minutosTotales ->
                minutosTotales > profesor.minutosMaximos
            }
            .join(Configuracion::class.java)
            .filter { _, _, config -> config.respetarLimiteHoras }
            .penalize(HardSoftScore.ONE_HARD) { profesor, minutosTotales, config ->
                minutosTotales - profesor.minutosMaximos
            }
            .asConstraint("Exceso de horas de trabajo del profesor")
    }

    // Regla HARD: El profesor asignado TIENE que saber dar esa asignatura (Dinamizado con Config)
    private fun profesorMateriaIncorrecta(factory: ConstraintFactory): Constraint {
        return factory.forEach(Leccion::class.java)
            .filter { leccion -> leccion.profesor != null }
            .filter { leccion -> !leccion.profesor!!.asignaturas.contains(leccion.asignatura) }
            .join(Configuracion::class.java)
            .filter { leccion, config -> config.respetarEspecialidad }
            .penalize(HardSoftScore.ONE_HARD)
            .asConstraint("El profesor no tiene la especialidad para esta materia")
    }

    // Regla HARD: El profesor debe estar disponible en la franja horaria (Dinamizado con Config)
    private fun profesorDisponible(factory: ConstraintFactory): Constraint {
        return factory.forEach(Leccion::class.java)
            .filter { leccion ->
                val slot = leccion.timeSlot
                val profe = leccion.profesor
                if (slot != null && profe != null) {
                    profe.availability.any { av ->
                        av.dayOfWeek == slot.dayOfWeek.value &&
                        slot.startTime.toString() >= av.startTime &&
                        slot.endTime.toString() <= av.endTime
                    }
                } else {
                    false
                }
            }
            .join(Configuracion::class.java)
            .filter { leccion, config -> config.respetarDisponibilidad }
            .penalize(HardSoftScore.ONE_HARD)
            .asConstraint("Disponibilidad del profesor no respetada")
    }

    // Regla Soft: Evitar huecos libres intermedios para los grupos (Dinamizado con Config)
    private fun evitarHuecosLibres(factory: ConstraintFactory): Constraint {
        return factory.forEach(Leccion::class.java)
            .filter { leccion -> leccion.timeSlot != null }
            .groupBy(
                { leccion -> Pair(leccion.grupo, leccion.timeSlot!!.dayOfWeek) },
                ConstraintCollectors.min { leccion -> leccion.timeSlot!!.indiceDeFranja },
                ConstraintCollectors.max { leccion -> leccion.timeSlot!!.indiceDeFranja },
                ConstraintCollectors.count()
            )
            .map { _, minIndice, maxIndice, cantidad ->
                val min = minIndice ?: 0
                val max = maxIndice ?: 0
                val franjasAbarcadas = (max - min) + 1
                franjasAbarcadas - cantidad
            }
            .filter { huecos -> huecos > 0 }
            .join(Configuracion::class.java)
            .penalize(HardSoftScore.ONE_SOFT) { huecos, config ->
                huecos * config.evitarHuecosPuntos
            }
            .asConstraint("Evitar huecos libres intermedios")
    }

    // Regla Soft: Preferir colocar las clases lo más temprano posible (Dinamizado con Config)
    private fun compactarTemprano(factory: ConstraintFactory): Constraint {
        return factory.forEach(Leccion::class.java)
            .filter { leccion -> leccion.timeSlot != null }
            .join(Configuracion::class.java)
            .penalize(HardSoftScore.ONE_SOFT) { leccion, config ->
                leccion.timeSlot!!.indiceDeFranja * config.compactarTempranoPuntos
            }
            .asConstraint("Compactar horario por la mañana")
    }

    // Regla Soft: Priorizar que el tutor dé clase a su grupo (Dinamizado con Config)
    private fun priorizarTutorDelGrupo(factory: ConstraintFactory): Constraint {
        return factory.forEach(Leccion::class.java)
            .filter { leccion -> leccion.profesor != null }
            .filter { leccion -> leccion.profesor?.nombre == leccion.grupo.tutor?.nombre }
            .join(Configuracion::class.java)
            .filter { leccion, config -> config.priorizarTutor }
            .reward(HardSoftScore.ONE_SOFT) { leccion, config ->
                config.priorizarTutorPuntos
            }
            .asConstraint("Priorizar que el tutor dé clase a su grupo")
    }

    // Regla Soft: Fomentar bloques de 60 minutos (Dinamizado con Config)
    private fun fomentarBloquesDe60Minutos(factory: ConstraintFactory): Constraint {
        return factory.forEach(Leccion::class.java)
            .join(
                Leccion::class.java,
                Joiners.equal(Leccion::grupo),
                Joiners.equal(Leccion::asignatura),
                Joiners.equal { leccion -> leccion.timeSlot?.dayOfWeek }
            )
            .filter { leccion1, leccion2 ->
                val slot1 = leccion1.timeSlot
                val slot2 = leccion2.timeSlot
                if (slot1 != null && slot2 != null) {
                    slot2.indiceDeFranja == slot1.indiceDeFranja + 1
                } else {
                    false
                }
            }
            .join(Configuracion::class.java)
            .reward(HardSoftScore.ONE_SOFT) { leccion1, leccion2, config ->
                config.fomentarBloques60Puntos
            }
            .asConstraint("Fomentar bloques de 60 minutos")
    }

    private fun limiteMaximoMinutosPorDia(factory: ConstraintFactory): Constraint {
        return factory.forEach(Leccion::class.java)
            .filter { leccion -> leccion.timeSlot != null }
            .groupBy(
                { leccion ->
                    val nombreUnicoGrupo = "${leccion.grupo.curso} ${leccion.grupo.nombre}"
                    AgrupacionDiaria(
                        nombreUnicoGrupo,
                        leccion.asignatura,
                        leccion.timeSlot!!.dayOfWeek,
                        leccion.minutosSemanales
                    )
                },
                ConstraintCollectors.sum { leccion -> leccion.timeSlot!!.duracionMinutos }
            )
            .join(Configuracion::class.java)
            .filter { llave, minutosTotalesDelDia, ajustes ->
                val promedioDiario = llave.minutosSemanales / 5.0
                val bloquesNecesarios = Math.ceil(promedioDiario / ajustes.tiempoMinimo).toInt()
                val limiteMatematico = bloquesNecesarios * ajustes.tiempoMinimo
                val limiteDiarioReal = maxOf(ajustes.tiempoMaximo, limiteMatematico)

                minutosTotalesDelDia > limiteDiarioReal
            }
            .penalize(
                HardSoftScore.ONE_HARD,
                { llave, minutosTotalesDelDia, ajustes ->
                    val promedioDiario = llave.minutosSemanales / 5.0
                    val bloquesNecesarios = Math.ceil(promedioDiario / ajustes.tiempoMinimo).toInt()
                    val limiteMatematico = bloquesNecesarios * ajustes.tiempoMinimo
                    val limiteDiarioReal = maxOf(ajustes.tiempoMaximo, limiteMatematico)

                    minutosTotalesDelDia - limiteDiarioReal
                }
            )
            .asConstraint("Exceso de minutos de una asignatura en un mismo día")
    }

    // Regla HARD: Un profesor no puede dar dos clases distintas en la misma franja horaria.
    private fun profesorConflicto(factory: ConstraintFactory): Constraint {
        return factory.forEachUniquePair(
            Leccion::class.java,
            Joiners.equal(Leccion::timeSlot),
            Joiners.equal(Leccion::profesor)
        )
        .penalize(HardSoftScore.ONE_HARD)
        .asConstraint("Conflicto de profesor")
    }

    // Regla HARD: Un grupo de alumnos no puede tener dos asignaturas a la vez.
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