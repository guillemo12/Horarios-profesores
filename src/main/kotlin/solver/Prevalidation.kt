package com.colegio.solver

import com.colegio.DTO.Configuracion
import org.slf4j.LoggerFactory

object Prevalidation {
    private val logger = LoggerFactory.getLogger("Prevalidation")

    fun isTeacherQualified(teacher: Profesor, asignatura: String, config: Configuracion): Boolean {
        if (!config.respetarEspecialidad) return true

        val asigClean = asignatura.trim().lowercase()

        // Coincidencia estricta con las especialidades registradas en la ficha del profesor
        return teacher.asignaturas.any {
            val profAsigClean = it.trim().lowercase()
            profAsigClean == asigClean || asigClean.contains(profAsigClean) || profAsigClean.contains(asigClean)
        }
    }

    fun detectarConflictosInviabilidad(
        lessons: List<Leccion>,
        timeSlots: List<TimeSlot>,
        teachers: List<Profesor>,
        config: Configuracion
    ): List<String> {
        val conflictos = mutableListOf<String>()
        val totalSlotsMinutes = timeSlots.sumOf { it.duracionMinutos }

        // 1. Solapamientos de Clases Fijadas Manualmente (PIN) en el Mismo Profesor
        val pinnedByTeacherSlot = lessons.filter { it.isPinned && it.timeSlot != null && it.profesor != null }
            .groupBy { Pair(it.timeSlot!!.id, it.profesor!!.nombre) }

        for ((key, pinnedList) in pinnedByTeacherSlot) {
            if (pinnedList.size > 1) {
                val slot = timeSlots.find { it.id == key.first }
                val teacherName = key.second
                val detalles = pinnedList.joinToString(", ") { "'${it.asignatura}' (${it.grupo.curso} ${it.grupo.nombre})" }
                conflictos.add("❌ Solapamiento Manual en Prof. '$teacherName': Tiene ${pinnedList.size} clases fijadas a la misma hora (${slot?.dayOfWeek} ${slot?.startTime}): $detalles.\n💡 Solución: Desclave una de las clases del profesor '$teacherName' en el cuadrante.")
            }
        }

        // 2. Solapamientos de Clases Fijadas Manualmente (PIN) en el Mismo Grupo
        val pinnedByGroupSlot = lessons.filter { it.isPinned && it.timeSlot != null }
            .groupBy { Pair(it.timeSlot!!.id, "${it.grupo.curso} ${it.grupo.nombre}") }

        for ((key, pinnedList) in pinnedByGroupSlot) {
            if (pinnedList.size > 1) {
                val slot = timeSlots.find { it.id == key.first }
                val gName = key.second
                val detalles = pinnedList.joinToString(", ") { "'${it.asignatura}'" }
                conflictos.add("❌ Solapamiento Manual en Grupo '$gName': Tiene ${pinnedList.size} asignaturas fijadas a la misma hora (${slot?.dayOfWeek} ${slot?.startTime}): $detalles.\n💡 Solución: Desclave una de las materias del grupo '$gName' en el cuadrante.")
            }
        }

        // 3. Capacidad del horario escolar por grupo superada
        val lessonsByGroup = lessons.groupBy { "${it.grupo.curso} ${it.grupo.nombre}" }
        for ((gName, groupLessons) in lessonsByGroup) {
            val totalGroupBlocksMinutes = groupLessons.size * config.tiempoMinimo
            if (totalGroupBlocksMinutes > totalSlotsMinutes) {
                conflictos.add("❌ Capacidad de Horario Superada (Grupo '$gName'): Tiene ${groupLessons.size} clases (${totalGroupBlocksMinutes} min), pero el horario semanal solo dispone de ${timeSlots.size} franjas (${totalSlotsMinutes} min). Sobran ${totalGroupBlocksMinutes - totalSlotsMinutes} min.\n💡 Solución: Reduzca las horas de las asignaturas del curso o añada más franjas horarias.")
            }
        }

        // 4. Asignaturas sin ningún profesor calificado
        val allSubjectsInLessons = lessons.map { it.asignatura }.distinct()
        for (asig in allSubjectsInLessons) {
            val validT = teachers.filter { isTeacherQualified(it, asig, config) }
            val gruposAfectados = lessons.filter { it.asignatura == asig }.map { "${it.grupo.curso} ${it.grupo.nombre}" }.distinct()

            if (validT.isEmpty()) {
                conflictos.add("❌ Especialidad No Cubierta: La asignatura '$asig' (presente en ${gruposAfectados.size} grupos: ${gruposAfectados.joinToString(", ")}) no tiene ningún profesor con esa especialidad en su ficha.\n💡 Solución: Edite la ficha de al menos un profesor (o profesor de apoyo) y añada la especialidad '$asig'.")
            }
        }

        // 5. ANÁLISIS DE DÉFICIT EXACTO DE HORAS Y PROFESORES POR ASIGNATURA
        for (asig in allSubjectsInLessons) {
            val demandMin = lessons.filter { it.asignatura == asig }.size * config.tiempoMinimo
            val qualifiedTeachers = teachers.filter { isTeacherQualified(it, asig, config) }
            val supplyMin = qualifiedTeachers.sumOf { it.minutosMaximos }

            if (demandMin > supplyMin) {
                val deficitMin = demandMin - supplyMin
                val deficitHours = deficitMin / 60.0
                val demandHours = demandMin / 60.0
                val supplyHours = supplyMin / 60.0
                val profesActuales = if (qualifiedTeachers.isEmpty()) "Ninguno" else qualifiedTeachers.joinToString { it.nombre }

                conflictos.add("❌ Déficit de Profesores en '$asig': Los grupos requieren ${demandHours}h/semana ($demandMin min) de '$asig', pero la plantilla cualificada ($profesActuales) solo tiene capacidad para ${supplyHours}h/semana ($supplyMin min).\n📊 FALTAN EXACTAMENTE: ${deficitHours} horas/semana ($deficitMin min) de profesores de '$asig'.\n💡 Solución: Añada la especialidad '$asig' a la ficha de 1 profesor de apoyo o aumente la jornada de los profesores de '$asig' en ${deficitHours} horas/semana.")
            }
        }

        // 6. Sobrecarga de Profesores en Reparto Docente Fijo con Horas Exactas
        if (config.respetarLimiteHoras) {
            for (teacher in teachers) {
                val leccionesDelProfe = lessons.filter { it.profesorFijo?.nombre == teacher.nombre }
                val minutosTotales = leccionesDelProfe.size * config.tiempoMinimo
                if (minutosTotales > teacher.minutosMaximos) {
                    val excesoMin = minutosTotales - teacher.minutosMaximos
                    val excesoHoras = excesoMin / 60.0
                    val asignaturasProfe = leccionesDelProfe.map { "${it.grupo.curso} ${it.grupo.nombre} (${it.asignatura})" }.distinct()
                    conflictos.add("❌ Exceso de Horas del Prof. '${teacher.nombre}': Se le han asignado ${minutosTotales / 60.0}h/semana (${minutosTotales} min) en Reparto Docente (${asignaturasProfe.joinToString(", ")}), pero su límite máximo es ${teacher.minutosMaximos / 60.0}h/semana (${teacher.minutosMaximos} min).\n📊 LE SOBRAN A ESTE PROFESOR: ${excesoHoras} horas/semana ($excesoMin min).\n💡 Solución: Reasigne ${excesoHoras}h/semana de '${teacher.nombre}' a otro docente o aumente sus horas máximas en su ficha en ${excesoHoras}h.")
                }
            }
        }

        // 7. Sobrecarga por Especialidad Única con Horas Exactas
        if (config.respetarLimiteHoras) {
            for (teacher in teachers) {
                val leccionesObligatorias = lessons.filter { lesson ->
                    val validT = if (lesson.profesorFijo != null) {
                        listOf(lesson.profesorFijo)
                    } else {
                        teachers.filter { isTeacherQualified(it, lesson.asignatura, config) }
                    }

                    validT.size == 1 && validT[0].nombre == teacher.nombre
                }
                val totalMin = leccionesObligatorias.size * config.tiempoMinimo
                if (totalMin > teacher.minutosMaximos) {
                    val excesoMin = totalMin - teacher.minutosMaximos
                    val excesoHoras = excesoMin / 60.0
                    val detalleMaterias = leccionesObligatorias.map { "${it.grupo.curso} ${it.grupo.nombre} (${it.asignatura})" }.distinct()
                    conflictos.add("❌ Sobrecarga del Prof. '${teacher.nombre}': Es el único docente capaz de dar materias que suman ${totalMin / 60.0}h/semana (${totalMin} min) (${detalleMaterias.joinToString(", ")}), pero su máximo es ${teacher.minutosMaximos / 60.0}h/semana (${teacher.minutosMaximos} min).\n📊 LE SOBRAN A ESTE PROFESOR: ${excesoHoras} horas/semana ($excesoMin min).\n💡 Solución: Añada la especialidad de estas materias a otro profesor para ayudarle con ${excesoHoras}h/semana.")
                }
            }
        }

        // 8. Balance Global de la Plantilla Completa del Colegio (Horas Totales Faltantes)
        val totalDemandMin = lessons.size * config.tiempoMinimo
        val totalTeacherCapacityMin = teachers.sumOf { it.minutosMaximos }
        if (totalDemandMin > totalTeacherCapacityMin) {
            val deficitMin = totalDemandMin - totalTeacherCapacityMin
            val deficitHours = deficitMin / 60.0
            val demandHours = totalDemandMin / 60.0
            val capacityHours = totalTeacherCapacityMin / 60.0

            conflictos.add("❌ Déficit General de Horas en la Plantilla del Colegio: Todas las clases juntas requieren ${demandHours}h/semana ($totalDemandMin min), pero la capacidad máxima combinada de todos los profesores es de solo ${capacityHours}h/semana ($totalTeacherCapacityMin min).\n📊 FALTAN EXACTAMENTE: ${deficitHours} horas/semana ($deficitMin min) en la plantilla total de profesores.\n💡 Solución: Aumente la jornada de los profesores o añada nuevos docentes por un total de ${deficitHours} horas/semana.")
        }

        // 8b. Sobrecarga Físicamente Imposible en el Calendario Semanal
        val totalSlotsCount = timeSlots.size
        for (teacher in teachers) {
            val leccionesDelProfe = lessons.filter { it.profesorFijo?.nombre == teacher.nombre }
            if (leccionesDelProfe.size > totalSlotsCount) {
                val excesoSlots = leccionesDelProfe.size - totalSlotsCount
                val excesoHoras = (excesoSlots * config.tiempoMinimo) / 60.0
                val totalHoras = (leccionesDelProfe.size * config.tiempoMinimo) / 60.0
                val maxHorasSemana = (totalSlotsCount * config.tiempoMinimo) / 60.0

                conflictos.add("❌ Asignación Imposible en el Calendario para el Prof. '${teacher.nombre}': Se le han asignado ${totalHoras}h/semana (${leccionesDelProfe.size} clases) en el Reparto Docente, pero la semana escolar completa solo dispone de ${maxHorasSemana}h ($totalSlotsCount franjas de 30 min).\n📊 LE SOBRAN A ESTE PROFESOR: ${excesoHoras}h/semana ($excesoSlots clases por encima del total semanal).\n💡 Solución: Reasigne las asignaturas sobrantes de '${teacher.nombre}' a otro docente en la pestaña 'Reparto Docente'.")
            }
        }

        return conflictos
    }
}
