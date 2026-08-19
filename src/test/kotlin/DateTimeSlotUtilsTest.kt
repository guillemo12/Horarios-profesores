package com.colegio.routing

import com.colegio.solver.TimeSlot
import java.time.DayOfWeek
import java.time.LocalDate
import java.time.LocalTime
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue

class DateTimeSlotUtilsTest {

    private fun createStandardSlots(): List<TimeSlot> {
        val days = listOf(DayOfWeek.MONDAY, DayOfWeek.TUESDAY, DayOfWeek.WEDNESDAY, DayOfWeek.THURSDAY, DayOfWeek.FRIDAY)
        val slots = mutableListOf<TimeSlot>()
        var counter = 1
        for (day in days) {
            var curr = LocalTime.of(8, 30)
            for (i in 1..10) {
                val end = curr.plusMinutes(30)
                slots.add(TimeSlot(id = "S_${counter++}", dayOfWeek = day, startTime = curr, endTime = end, duracionMinutos = 30, indiceDeFranja = i))
                curr = end
            }
        }
        return slots
    }

    // -------------------------------------------------------------
    // 1. getIsoDateTime - 2+ Tests
    // -------------------------------------------------------------
    @Test
    fun `getIsoDateTime - Happy Path generates correct ISO timestamp relative to reference week Monday`() {
        val refMonday = LocalDate.of(2026, 8, 17) // Monday
        val iso = DateTimeSlotUtils.getIsoDateTime(DayOfWeek.WEDNESDAY, LocalTime.of(10, 30), refMonday)
        assertEquals("2026-08-19T10:30:00", iso)
    }

    @Test
    fun `getIsoDateTime - Edge Case handles start and end of week (Monday and Friday)`() {
        val refMonday = LocalDate.of(2026, 8, 17)
        val isoMonday = DateTimeSlotUtils.getIsoDateTime(DayOfWeek.MONDAY, LocalTime.of(8, 30), refMonday)
        val isoFriday = DateTimeSlotUtils.getIsoDateTime(DayOfWeek.FRIDAY, LocalTime.of(14, 30), refMonday)

        assertEquals("2026-08-17T08:30:00", isoMonday)
        assertEquals("2026-08-21T14:30:00", isoFriday)
    }

    // -------------------------------------------------------------
    // 2. cleanIsoString - 2+ Tests
    // -------------------------------------------------------------
    @Test
    fun `cleanIsoString - Happy Path cleans formatted date string with space and milliseconds`() {
        assertEquals("2026-08-17T09:00:00", DateTimeSlotUtils.cleanIsoString("2026-08-17 09:00:00.123"))
        assertEquals("2026-08-17T09:00:00", DateTimeSlotUtils.cleanIsoString("2026-08-17T09:00:00.000Z"))
    }

    @Test
    fun `cleanIsoString - Edge Case handles already clean ISO string, whitespace or timezone offsets`() {
        assertEquals("2026-08-17T09:00:00", DateTimeSlotUtils.cleanIsoString("  2026-08-17T09:00:00  "))
        assertEquals("2026-08-17T09:00:00", DateTimeSlotUtils.cleanIsoString("2026-08-17T09:00:00+02:00"))
    }

    // -------------------------------------------------------------
    // 3. findTimeSlot - 2+ Tests
    // -------------------------------------------------------------
    @Test
    fun `findTimeSlot - Happy Path finds matching slot in slots collection`() {
        val slots = createStandardSlots()
        val match = DateTimeSlotUtils.findTimeSlot("2026-08-17T08:30:00", slots)
        assertNotNull(match)
        assertEquals(DayOfWeek.MONDAY, match.dayOfWeek)
        assertEquals(LocalTime.of(8, 30), match.startTime)
    }

    @Test
    fun `findTimeSlot - Edge Case returns null on corrupted string or slot not in list`() {
        val slots = createStandardSlots()
        assertNull(DateTimeSlotUtils.findTimeSlot("invalid-date-string", slots))
        assertNull(DateTimeSlotUtils.findTimeSlot("2026-08-17T23:59:00", slots))
    }

    // -------------------------------------------------------------
    // 4. findTimeSlots (Multi-slot) - 2+ Tests
    // -------------------------------------------------------------
    @Test
    fun `findTimeSlots - Happy Path returns multiple matching 30m slots for a 1_5h range`() {
        val slots = createStandardSlots()
        val matched = DateTimeSlotUtils.findTimeSlots("2026-08-17T08:30:00", "2026-08-17T10:00:00", slots)
        assertEquals(3, matched.size, "Debe abarcar 3 franjas de 30m para el intervalo 08:30 a 10:00")
        assertEquals(LocalTime.of(8, 30), matched[0].startTime)
        assertEquals(LocalTime.of(9, 30), matched[2].startTime)
    }

    @Test
    fun `findTimeSlots - Edge Case returns single fallback or empty list on invalid input`() {
        val slots = createStandardSlots()
        assertTrue(DateTimeSlotUtils.findTimeSlots("invalid", "invalid", slots).isEmpty())
    }
}
