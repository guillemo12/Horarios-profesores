package com.colegio.solver

import com.colegio.DTO.TeacherAvailabilityDto
import java.time.DayOfWeek

/**
 * Clave única inmutable para agrupar lecciones por unidad académica (Curso, Grupo y Asignatura).
 */
data class UnitKey(
    val grupoCurso: String,
    val grupoNombre: String,
    val asignatura: String
)

object SolverConstraintUtils {

    /**
     * Traduce un DayOfWeek de la JVM al nombre del día en español para reportes y logs.
     */
    fun traducirDia(dia: DayOfWeek?): String {
        if (dia == null) return "DESCONOCIDO"
        return when (dia) {
            DayOfWeek.MONDAY -> "LUNES"
            DayOfWeek.TUESDAY -> "MARTES"
            DayOfWeek.WEDNESDAY -> "MIÉRCOLES"
            DayOfWeek.THURSDAY -> "JUEVES"
            DayOfWeek.FRIDAY -> "VIERNES"
            DayOfWeek.SATURDAY -> "SÁBADO"
            DayOfWeek.SUNDAY -> "DOMINGO"
        }
    }

    /**
     * Comprueba si una franja horaria coincide con un periodo no disponible/bloqueado para un docente.
     */
    fun isSlotBlockedForTeacher(slot: TimeSlot, availabilityBlocks: List<TeacherAvailabilityDto>?): Boolean {
        if (availabilityBlocks.isNullOrEmpty()) return false
        val dayVal = slot.dayOfWeek.value
        val slotStart = slot.startTime.toString()
        val slotEnd = slot.endTime.toString()

        for (block in availabilityBlocks) {
            if (block.dayOfWeek != dayVal) continue
            if (slotStart >= block.startTime && slotEnd <= block.endTime) {
                return true
            }
        }
        return false
    }

    /**
     * Agrupa una colección de lecciones individuales en unidades compactas por grupo y asignatura.
     */
    fun groupLessonsIntoUnits(lessons: List<Leccion>?): Map<UnitKey, List<Leccion>> {
        if (lessons.isNullOrEmpty()) return emptyMap()
        val result = mutableMapOf<UnitKey, MutableList<Leccion>>()
        for (lesson in lessons) {
            val key = UnitKey(lesson.grupo.curso, lesson.grupo.nombre, lesson.asignatura)
            result.getOrPut(key) { mutableListOf() }.add(lesson)
        }
        return result
    }

    /**
     * Obtiene la lista única y ordenada de nombres completos de grupos a partir de las lecciones.
     */
    fun extractGroupNames(lessons: List<Leccion>?): List<String> {
        if (lessons.isNullOrEmpty()) return emptyList()
        return lessons.map { "${it.grupo.curso} ${it.grupo.nombre}" }.distinct()
    }
}
