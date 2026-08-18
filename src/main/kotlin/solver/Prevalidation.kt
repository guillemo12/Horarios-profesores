package com.colegio.solver

import com.colegio.DTO.Configuracion
import com.colegio.PrevalidationCheck
import com.colegio.PrevalidationResult
import org.slf4j.LoggerFactory

object Prevalidation {
    private val logger = LoggerFactory.getLogger("Prevalidation")

    fun isTeacherQualified(teacher: Profesor, asignatura: String, config: Configuracion): Boolean {
        if (!config.respetarEspecialidad) return true

        val asigClean = asignatura.trim().lowercase()

        // Coincidencia con las especialidades registradas en la ficha del profesor
        return teacher.asignaturas.any {
            val profAsigClean = it.trim().lowercase()
            profAsigClean == asigClean || asigClean.contains(profAsigClean) || profAsigClean.contains(asigClean)
        }
    }

    fun generarReportePrevalidacion(
        lessons: List<Leccion>,
        timeSlots: List<TimeSlot>,
        teachers: List<Profesor>,
        config: Configuracion
    ): PrevalidationResult {
        val checks = mutableListOf<PrevalidationCheck>()
        val totalSlotsMinutes = timeSlots.sumOf { it.duracionMinutos }

        // 1. Solapamientos de Clases Fijadas Manualmente (PIN)
        val pinErrors = mutableListOf<String>()
        val pinnedByTeacherSlot = lessons.filter { it.isPinned && it.timeSlot != null && it.profesor != null }
            .groupBy { Pair(it.timeSlot!!.id, it.profesor!!.nombre) }
        for ((key, pinnedList) in pinnedByTeacherSlot) {
            if (pinnedList.size > 1) {
                val slot = timeSlots.find { it.id == key.first }
                val teacherName = key.second
                val detalles = pinnedList.joinToString(", ") { "'${it.asignatura}' (${it.grupo.curso} ${it.grupo.nombre})" }
                pinErrors.add("Prof. '$teacherName' tiene ${pinnedList.size} clases fijadas a la misma hora (${slot?.dayOfWeek} ${slot?.startTime}): $detalles.")
            }
        }
        val pinnedByGroupSlot = lessons.filter { it.isPinned && it.timeSlot != null }
            .groupBy { Pair(it.timeSlot!!.id, "${it.grupo.curso} ${it.grupo.nombre}") }
        for ((key, pinnedList) in pinnedByGroupSlot) {
            if (pinnedList.size > 1) {
                val slot = timeSlots.find { it.id == key.first }
                val gName = key.second
                val detalles = pinnedList.joinToString(", ") { "'${it.asignatura}'" }
                pinErrors.add("Grupo '$gName' tiene ${pinnedList.size} asignaturas fijadas a la misma hora (${slot?.dayOfWeek} ${slot?.startTime}): $detalles.")
            }
        }
        if (pinErrors.isEmpty()) {
            checks.add(PrevalidationCheck("Solapamientos de Clases Fijadas (Pin)", "ok", "No hay solapamientos entre clases fijadas manualmente"))
        } else {
            checks.add(PrevalidationCheck("Solapamientos de Clases Fijadas (Pin)", "error", "Se han detectado ${pinErrors.size} colisiones en clases con Pin", pinErrors))
        }

        // 2. Capacidad del horario escolar por grupo
        val groupCapacityErrors = mutableListOf<String>()
        val lessonsByGroup = lessons.groupBy { "${it.grupo.curso} ${it.grupo.nombre}" }
        for ((gName, groupLessons) in lessonsByGroup) {
            val totalGroupBlocksMinutes = groupLessons.size * config.tiempoMinimo
            if (totalGroupBlocksMinutes > totalSlotsMinutes) {
                val sobranMin = totalGroupBlocksMinutes - totalSlotsMinutes
                groupCapacityErrors.add("Grupo '$gName': Requiere ${totalGroupBlocksMinutes / 60.0}h (${groupLessons.size} clases), pero el horario semanal solo dispone de ${totalSlotsMinutes / 60.0}h (${timeSlots.size} franjas). Exceso: +${sobranMin / 60.0}h.")
            }
        }
        if (groupCapacityErrors.isEmpty()) {
            checks.add(PrevalidationCheck("Capacidad Horaria por Grupo", "ok", "Todos los grupos caben dentro del horario lectivo semanal (${totalSlotsMinutes / 60.0}h disponibles)"))
        } else {
            checks.add(PrevalidationCheck("Capacidad Horaria por Grupo", "error", "Hay grupos que superan las franjas horarias semanales disponibles", groupCapacityErrors))
        }

        // 3. Cobertura de Especialidades
        val specialtyErrors = mutableListOf<String>()
        val allSubjectsInLessons = lessons.map { it.asignatura }.distinct()
        for (asig in allSubjectsInLessons) {
            val validT = teachers.filter { isTeacherQualified(it, asig, config) }
            val gruposAfectados = lessons.filter { it.asignatura == asig }.map { "${it.grupo.curso} ${it.grupo.nombre}" }.distinct()
            if (validT.isEmpty()) {
                specialtyErrors.add("Asignatura '$asig' (presente en: ${gruposAfectados.joinToString(", ")}): No tiene ningún profesor con esa especialidad en su ficha.")
            }
        }
        if (specialtyErrors.isEmpty()) {
            checks.add(PrevalidationCheck("Cobertura de Especialidades", "ok", "Todas las asignaturas tienen docentes cualificados en plantilla"))
        } else {
            checks.add(PrevalidationCheck("Cobertura de Especialidades", "error", "Existen asignaturas sin ningún docente cualificado asignable", specialtyErrors))
        }

        // 4. Carga y Jornada del Profesorado (Reparto Docente)
        val workloadErrors = mutableListOf<String>()
        if (config.respetarLimiteHoras) {
            for (teacher in teachers) {
                val leccionesDelProfe = lessons.filter { it.profesorFijo?.nombre == teacher.nombre }
                val minutosTotales = leccionesDelProfe.size * config.tiempoMinimo
                if (minutosTotales > teacher.minutosMaximos) {
                    val excesoMin = minutosTotales - teacher.minutosMaximos
                    val excesoHoras = excesoMin / 60.0
                    val asignaturasProfe = leccionesDelProfe.map { "${it.grupo.curso} ${it.grupo.nombre} (${it.asignatura})" }.distinct()
                    workloadErrors.add("Prof. '${teacher.nombre}': Se le han asignado ${minutosTotales / 60.0}h/semana (máx: ${teacher.minutosMaximos / 60.0}h) en Reparto Docente. Exceso: +${excesoHoras}h (${asignaturasProfe.joinToString(", ")}).")
                }
            }
        }
        if (workloadErrors.isEmpty()) {
            checks.add(PrevalidationCheck("Jornada y Carga del Profesorado", "ok", "Ningún docente supera su jornada lectiva máxima asignada"))
        } else {
            checks.add(PrevalidationCheck("Jornada y Carga del Profesorado", "error", "Hay ${workloadErrors.size} docente(s) con asignaciones que superan sus horas máximas", workloadErrors))
        }

        // 5. Balance Global de la Plantilla
        val totalDemandMin = lessons.size * config.tiempoMinimo
        val totalTeacherCapacityMin = teachers.sumOf { it.minutosMaximos }
        if (totalDemandMin > totalTeacherCapacityMin) {
            val deficitMin = totalDemandMin - totalTeacherCapacityMin
            val deficitHours = deficitMin / 60.0
            checks.add(PrevalidationCheck(
                "Balance Global de Plantilla",
                "error",
                "La demanda total de clases (${totalDemandMin / 60.0}h) supera la capacidad combinada de todos los profesores (${totalTeacherCapacityMin / 60.0}h). Faltan ${deficitHours}h de plantilla.",
                listOf("Demanda total: ${totalDemandMin / 60.0}h/semana", "Capacidad disponible: ${totalTeacherCapacityMin / 60.0}h/semana", "Déficit global: ${deficitHours}h/semana")
            ))
        } else {
            checks.add(PrevalidationCheck("Balance Global de Plantilla", "ok", "Capacidad global suficiente (${totalTeacherCapacityMin / 60.0}h disponibles vs ${totalDemandMin / 60.0}h demandadas)"))
        }

        val hasErrors = checks.any { it.status == "error" }
        return PrevalidationResult(viable = !hasErrors, checks = checks)
    }

    fun detectarConflictosInviabilidad(
        lessons: List<Leccion>,
        timeSlots: List<TimeSlot>,
        teachers: List<Profesor>,
        config: Configuracion
    ): List<String> {
        val result = generarReportePrevalidacion(lessons, timeSlots, teachers, config)
        val allErrors = mutableListOf<String>()
        result.checks.filter { it.status == "error" }.forEach { check ->
            if (check.details.isNotEmpty()) {
                allErrors.addAll(check.details)
            } else {
                allErrors.add("${check.name}: ${check.message}")
            }
        }
        return allErrors
    }
}
