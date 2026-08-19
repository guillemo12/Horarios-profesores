package com.colegio.solver

import com.colegio.DTO.TeacherAvailabilityDto
import java.time.DayOfWeek
import java.time.LocalTime
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class SolverConstraintUtilsTest {

    private fun createSlot(day: DayOfWeek, start: String, end: String): TimeSlot {
        return TimeSlot(
            id = "s1",
            dayOfWeek = day,
            startTime = LocalTime.parse(start),
            endTime = LocalTime.parse(end),
            duracionMinutos = 30,
            indiceDeFranja = 1
        )
    }

    // -------------------------------------------------------------
    // 1. isSlotBlockedForTeacher - 2+ Tests
    // -------------------------------------------------------------
    @Test
    fun `isSlotBlockedForTeacher - Happy Path returns true when slot falls within teacher blocked interval`() {
        val slot = createSlot(DayOfWeek.MONDAY, "09:00", "09:30")
        val blocks = listOf(
            TeacherAvailabilityDto(dayOfWeek = 1, startTime = "08:30", endTime = "10:00")
        )

        val isBlocked = SolverConstraintUtils.isSlotBlockedForTeacher(slot, blocks)
        assertTrue(isBlocked, "La franja de 09:00 a 09:30 debe estar bloqueada por el intervalo 08:30-10:00 del lunes")
    }

    @Test
    fun `isSlotBlockedForTeacher - Edge Case returns false when day differs or block list is empty or null`() {
        val slot = createSlot(DayOfWeek.TUESDAY, "09:00", "09:30")
        val blocks = listOf(
            TeacherAvailabilityDto(dayOfWeek = 1, startTime = "08:30", endTime = "10:00") // Monday only
        )

        assertFalse(SolverConstraintUtils.isSlotBlockedForTeacher(slot, blocks), "No debe bloquear si el día difiere")
        assertFalse(SolverConstraintUtils.isSlotBlockedForTeacher(slot, emptyList()), "No debe bloquear con lista vacía")
        assertFalse(SolverConstraintUtils.isSlotBlockedForTeacher(slot, null), "No debe bloquear con lista nula")
    }

    // -------------------------------------------------------------
    // 2. groupLessonsIntoUnits - 2+ Tests
    // -------------------------------------------------------------
    @Test
    fun `groupLessonsIntoUnits - Happy Path groups lessons sharing course group and subject`() {
        val tutor = Profesor(nombre = "T1", asignaturas = listOf("Mates"), asignaturasPreferidas = emptyList(), minutosMaximos = 1000)
        val g1 = Grupo(curso = "1º", nombre = "A", tutor = tutor)
        val g2 = Grupo(curso = "1º", nombre = "B", tutor = tutor)

        val l1 = Leccion(id = "l1", asignatura = "Mates", grupo = g1, minutosSemanales = 30)
        val l2 = Leccion(id = "l2", asignatura = "Mates", grupo = g1, minutosSemanales = 30)
        val l3 = Leccion(id = "l3", asignatura = "Mates", grupo = g2, minutosSemanales = 30)

        val units = SolverConstraintUtils.groupLessonsIntoUnits(listOf(l1, l2, l3))
        assertEquals(2, units.size, "Deben crearse exactamente 2 unidades académicas")

        val key1A = UnitKey("1º", "A", "Mates")
        val key1B = UnitKey("1º", "B", "Mates")

        assertEquals(2, units[key1A]?.size)
        assertEquals(1, units[key1B]?.size)
    }

    @Test
    fun `groupLessonsIntoUnits - Edge Case returns empty map when lessons list is null or empty`() {
        assertTrue(SolverConstraintUtils.groupLessonsIntoUnits(emptyList()).isEmpty())
        assertTrue(SolverConstraintUtils.groupLessonsIntoUnits(null).isEmpty())
    }

    // -------------------------------------------------------------
    // 3. extractGroupNames - 2+ Tests
    // -------------------------------------------------------------
    @Test
    fun `extractGroupNames - Happy Path extracts distinct group names`() {
        val tutor = Profesor(nombre = "T1", asignaturas = listOf("Mates"), asignaturasPreferidas = emptyList(), minutosMaximos = 1000)
        val g1 = Grupo(curso = "1º", nombre = "A", tutor = tutor)
        val g2 = Grupo(curso = "2º", nombre = "B", tutor = tutor)

        val l1 = Leccion(id = "l1", asignatura = "Mates", grupo = g1, minutosSemanales = 30)
        val l2 = Leccion(id = "l2", asignatura = "Lengua", grupo = g1, minutosSemanales = 30)
        val l3 = Leccion(id = "l3", asignatura = "Física", grupo = g2, minutosSemanales = 30)

        val groupNames = SolverConstraintUtils.extractGroupNames(listOf(l1, l2, l3))
        assertEquals(listOf("1º A", "2º B"), groupNames)
    }

    @Test
    fun `extractGroupNames - Edge Case returns empty list when input is empty or null`() {
        assertTrue(SolverConstraintUtils.extractGroupNames(emptyList()).isEmpty())
        assertTrue(SolverConstraintUtils.extractGroupNames(null).isEmpty())
    }
}
