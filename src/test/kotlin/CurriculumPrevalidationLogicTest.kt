package com.colegio

import com.colegio.DTO.Configuracion
import com.colegio.DTO.TeacherAvailabilityDto
import com.colegio.solver.*
import java.time.DayOfWeek
import java.time.LocalTime
import java.util.UUID
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class CurriculumPrevalidationLogicTest {

    private fun createStandardSlots(): List<TimeSlot> {
        val days = listOf(DayOfWeek.MONDAY, DayOfWeek.TUESDAY, DayOfWeek.WEDNESDAY, DayOfWeek.THURSDAY, DayOfWeek.FRIDAY)
        val slots = mutableListOf<TimeSlot>()
        var counter = 1
        for (day in days) {
            var curr = LocalTime.of(9, 0)
            for (i in 1..8) {
                val end = curr.plusMinutes(30)
                slots.add(TimeSlot(id = "S_${counter++}", dayOfWeek = day, startTime = curr, endTime = end, duracionMinutos = 30, indiceDeFranja = i))
                curr = end
            }
        }
        return slots
    }

    @Test
    fun `test 1 (Happy Path) - viable curriculum returns zero unfeasible conflicts`() {
        val slots = createStandardSlots()
        val tutor = Profesor(nombre = "Tutor 1", asignaturas = listOf("Matemáticas", "Lengua"), asignaturasPreferidas = emptyList(), minutosMaximos = 1500)
        val g = Grupo(curso = "1º", nombre = "A", tutor = tutor)

        val lessons = listOf(
            Leccion(id = UUID.randomUUID().toString(), asignatura = "Matemáticas", grupo = g, minutosSemanales = 300, profesorFijo = tutor),
            Leccion(id = UUID.randomUUID().toString(), asignatura = "Lengua", grupo = g, minutosSemanales = 300, profesorFijo = tutor)
        )

        val config = Configuracion(respetarEspecialidad = true, respetarLimiteHoras = true, respetarDisponibilidad = true)
        val conflicts = Prevalidation.detectarConflictosInviabilidad(lessons, slots, listOf(tutor), config)

        assertTrue(conflicts.isEmpty(), "Un plan viable no debe generar conflictos de prevalidación")
    }

    @Test
    fun `test 2 (Edge Case) - detects teacher overload exceeding maximum weekly minutes`() {
        val slots = createStandardSlots()
        // Profesor con límite estricto de 300 minutos (5 horas)
        val profeSobrecargado = Profesor(
            nombre = "Profe Sobrecargado",
            asignaturas = listOf("Física"),
            asignaturasPreferidas = emptyList(),
            minutosMaximos = 300
        )
        val g1 = Grupo(curso = "1º", nombre = "A", tutor = profeSobrecargado)
        val g2 = Grupo(curso = "2º", nombre = "A", tutor = profeSobrecargado)

        // Se le asignan 600 minutos en total (supera 300)
        val lessons = mutableListOf<Leccion>()
        repeat(10) { lessons.add(Leccion(id = UUID.randomUUID().toString(), asignatura = "Física", grupo = g1, minutosSemanales = 300, profesorFijo = profeSobrecargado)) }
        repeat(10) { lessons.add(Leccion(id = UUID.randomUUID().toString(), asignatura = "Física", grupo = g2, minutosSemanales = 300, profesorFijo = profeSobrecargado)) }

        val config = Configuracion(respetarLimiteHoras = true, respetarEspecialidad = true)
        val conflicts = Prevalidation.detectarConflictosInviabilidad(lessons, slots, listOf(profeSobrecargado), config)

        assertTrue(conflicts.isNotEmpty(), "Debe detectar sobrecarga horaria del docente")
        assertTrue(conflicts.any { it.contains("Sobrecarga") || it.contains("excede") || it.contains("minutos") })
    }

    @Test
    fun `test 3 (Edge Case) - detects subject with no qualified specialist teachers`() {
        val slots = createStandardSlots()
        val profeLengua = Profesor(nombre = "Profe Lengua", asignaturas = listOf("Lengua"), asignaturasPreferidas = emptyList(), minutosMaximos = 1500)
        val g = Grupo(curso = "1º", nombre = "A", tutor = profeLengua)

        // Lección de Robótica sin ningún profesor cualificado en la plantilla
        val lessonRobotica = Leccion(
            id = UUID.randomUUID().toString(),
            asignatura = "Robótica Avanzada",
            grupo = g,
            minutosSemanales = 300,
            profesorFijo = null
        )

        val config = Configuracion(respetarEspecialidad = true)
        val conflicts = Prevalidation.detectarConflictosInviabilidad(listOf(lessonRobotica), slots, listOf(profeLengua), config)

        assertTrue(conflicts.isNotEmpty(), "Debe detectar que no hay docentes especialistas para la asignatura")
        assertTrue(conflicts.any { it.contains("Robótica Avanzada") || it.contains("especialista") || it.contains("Sin profesor") })
    }
}
