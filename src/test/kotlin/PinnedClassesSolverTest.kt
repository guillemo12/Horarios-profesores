package com.colegio

import com.colegio.DTO.Configuracion
import com.colegio.solver.*
import java.time.DayOfWeek
import java.time.LocalTime
import java.util.UUID
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.test.assertTrue

class PinnedClassesSolverTest {

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
    fun `test solver respects single pinned class at exact slot`() {
        val slots = createStandardSlots()
        val tutor = Profesor(nombre = "Tutor 1", asignaturas = listOf("Matemáticas", "Lengua"), asignaturasPreferidas = emptyList(), minutosMaximos = 1350)
        val g1 = Grupo(curso = "1º", nombre = "A", tutor = tutor)

        val targetSlot = slots[3] // Franja específica
        val pinnedLesson = Leccion(
            id = "PIN_MAT_1",
            asignatura = "Matemáticas",
            grupo = g1,
            minutosSemanales = 30,
            profesorFijo = tutor
        ).apply {
            isPinned = true
            timeSlot = targetSlot
            profesor = tutor
        }

        val otherLessons = mutableListOf<Leccion>()
        repeat(8) {
            otherLessons.add(Leccion(id = UUID.randomUUID().toString(), asignatura = "Lengua", grupo = g1, minutosSemanales = 30, profesorFijo = tutor))
        }

        val allLessons = listOf(pinnedLesson) + otherLessons
        val config = Configuracion(priorizarTutor = true, tiempoMinimo = 30, tiempoMaximo = 60, respetarEspecialidad = true, respetarLimiteHoras = true)
        val result = OrToolsScheduleSolver.solve(slots, allLessons, listOf(tutor), config, timeLimitSeconds = 3.0)

        assertTrue(result.isFeasible, "El solver debe encontrar solución factible")
        val scheduledPin = result.solvedLessons.find { it.id == "PIN_MAT_1" }
        assertNotNull(scheduledPin, "La lección fijada debe estar en el horario generado")
        assertEquals(targetSlot.id, scheduledPin.timeSlot?.id, "La clase fijada debe estar exactamente en el slot objetivo ${targetSlot.id}")
        assertTrue(scheduledPin.isPinned, "La propiedad isPinned debe mantenerse en true")
    }

    @Test
    fun `test solver respects multiple pinned classes across multiple groups`() {
        val slots = createStandardSlots()
        val tutor1 = Profesor(nombre = "Tutor 1", asignaturas = listOf("Matemáticas"), asignaturasPreferidas = emptyList(), minutosMaximos = 1350)
        val tutor2 = Profesor(nombre = "Tutor 2", asignaturas = listOf("Lengua"), asignaturasPreferidas = emptyList(), minutosMaximos = 1350)

        val g1 = Grupo(curso = "1º", nombre = "A", tutor = tutor1)
        val g2 = Grupo(curso = "2º", nombre = "A", tutor = tutor2)

        val pin1 = Leccion(id = "PIN_G1", asignatura = "Matemáticas", grupo = g1, minutosSemanales = 30, profesorFijo = tutor1).apply {
            isPinned = true
            timeSlot = slots[0]
            profesor = tutor1
        }
        val pin2 = Leccion(id = "PIN_G2", asignatura = "Lengua", grupo = g2, minutosSemanales = 30, profesorFijo = tutor2).apply {
            isPinned = true
            timeSlot = slots[1]
            profesor = tutor2
        }

        val lessons = mutableListOf(pin1, pin2)
        repeat(6) { lessons.add(Leccion(id = UUID.randomUUID().toString(), asignatura = "Matemáticas", grupo = g1, minutosSemanales = 30, profesorFijo = tutor1)) }
        repeat(6) { lessons.add(Leccion(id = UUID.randomUUID().toString(), asignatura = "Lengua", grupo = g2, minutosSemanales = 30, profesorFijo = tutor2)) }

        val config = Configuracion(priorizarTutor = true, tiempoMinimo = 30, tiempoMaximo = 60, respetarEspecialidad = true, respetarLimiteHoras = true)
        val result = OrToolsScheduleSolver.solve(slots, lessons, listOf(tutor1, tutor2), config, timeLimitSeconds = 3.0)

        assertTrue(result.isFeasible)
        val resPin1 = result.solvedLessons.find { it.id == "PIN_G1" }
        val resPin2 = result.solvedLessons.find { it.id == "PIN_G2" }

        assertEquals(slots[0].id, resPin1?.timeSlot?.id, "Pin 1 debe permanecer en slots[0]")
        assertEquals(slots[1].id, resPin2?.timeSlot?.id, "Pin 2 debe permanecer en slots[1]")
    }

    @Test
    fun `test solver respects 1-hour consecutive pinned class (2 slots of 30m) without splitting or moving`() {
        val slots = createStandardSlots()
        val tutor = Profesor(nombre = "Tutor 1", asignaturas = listOf("Matemáticas", "Lengua"), asignaturasPreferidas = emptyList(), minutosMaximos = 1350)
        val g1 = Grupo(curso = "1º", nombre = "A", tutor = tutor)

        // Clase de 1 hora fijada (09:00 - 09:30 y 09:30 - 10:00)
        val slot1 = slots[0] // 09:00 - 09:30
        val slot2 = slots[1] // 09:30 - 10:00

        val pinPart1 = Leccion(id = "PIN_1H_PART1", asignatura = "Matemáticas", grupo = g1, minutosSemanales = 60, profesorFijo = tutor).apply {
            isPinned = true
            timeSlot = slot1
            profesor = tutor
        }
        val pinPart2 = Leccion(id = "PIN_1H_PART2", asignatura = "Matemáticas", grupo = g1, minutosSemanales = 60, profesorFijo = tutor).apply {
            isPinned = true
            timeSlot = slot2
            profesor = tutor
        }

        val otherLessons = mutableListOf<Leccion>()
        repeat(8) {
            otherLessons.add(Leccion(id = UUID.randomUUID().toString(), asignatura = "Lengua", grupo = g1, minutosSemanales = 30, profesorFijo = tutor))
        }

        val allLessons = listOf(pinPart1, pinPart2) + otherLessons
        val config = Configuracion(priorizarTutor = true, tiempoMinimo = 30, tiempoMaximo = 60, respetarEspecialidad = true, respetarLimiteHoras = true)
        val result = OrToolsScheduleSolver.solve(slots, allLessons, listOf(tutor), config, timeLimitSeconds = 3.0)

        assertTrue(result.isFeasible, "El solver debe encontrar solución factible")
        val resPin1 = result.solvedLessons.find { it.id == "PIN_1H_PART1" }
        val resPin2 = result.solvedLessons.find { it.id == "PIN_1H_PART2" }

        assertNotNull(resPin1, "La parte 1 de la clase de 1h debe estar presente")
        assertNotNull(resPin2, "La parte 2 de la clase de 1h debe estar presente")

        assertEquals(slot1.id, resPin1.timeSlot?.id, "La primera media hora de la clase de 1h debe estar exactamente en 09:00 - 09:30")
        assertEquals(slot2.id, resPin2.timeSlot?.id, "La segunda media hora de la clase de 1h debe estar exactamente en 09:30 - 10:00")
        assertTrue(resPin1.isPinned, "La parte 1 debe mantener el pin")
        assertTrue(resPin2.isPinned, "La parte 2 debe mantener el pin")
    }
}
