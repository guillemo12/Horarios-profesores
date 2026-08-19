package com.colegio.solver

import com.colegio.DTO.Configuracion
import java.time.DayOfWeek
import java.time.LocalTime
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class SolverLessonDataLoaderTest {

    private fun createDefaultConfig(): Configuracion {
        return Configuracion(
            tiempoMinimo = 30,
            tiempoMaximo = 60,
            priorizarTutor = true,
            minutosMaximosProfesor = 1500,
            horaInicioClases = "09:00",
            horaFinClases = "14:00",
            horaInicioRecreo = "11:30",
            duracionRecreo = 30,
            respetarEspecialidad = true,
            respetarLimiteHoras = true,
            respetarDisponibilidad = true
        )
    }

    // -------------------------------------------------------------
    // 1. calculateBlocksCount - 2+ Tests
    // -------------------------------------------------------------
    @Test
    fun `calculateBlocksCount - Happy Path calculates exact number of 30m blocks for weekly minutes`() {
        assertEquals(10, SolverLessonDataLoader.calculateBlocksCount(300, 30))
        assertEquals(5, SolverLessonDataLoader.calculateBlocksCount(150, 30))
        assertEquals(2, SolverLessonDataLoader.calculateBlocksCount(60, 30))
    }

    @Test
    fun `calculateBlocksCount - Edge Case returns 0 for zero or negative inputs or zero slot duration`() {
        assertEquals(0, SolverLessonDataLoader.calculateBlocksCount(0, 30))
        assertEquals(0, SolverLessonDataLoader.calculateBlocksCount(-100, 30))
        assertEquals(0, SolverLessonDataLoader.calculateBlocksCount(300, 0))
        assertEquals(0, SolverLessonDataLoader.calculateBlocksCount(300, -10))
    }

    // -------------------------------------------------------------
    // 2. generateTimeSlots - 2+ Tests
    // -------------------------------------------------------------
    @Test
    fun `generateTimeSlots - Happy Path generates standard weekly time slots excluding recess`() {
        val config = createDefaultConfig()
        val slots = SolverLessonDataLoader.generateTimeSlots(config)

        // 09:00 a 14:00 = 5 horas = 10 franjas de 30m - 1 franja de recreo (11:30-12:00) = 9 franjas por día
        // 9 franjas * 5 días = 45 franjas semanales
        assertEquals(45, slots.size)

        val mondaySlots = slots.filter { it.dayOfWeek == DayOfWeek.MONDAY }
        assertEquals(9, mondaySlots.size)
        assertEquals(LocalTime.of(9, 0), mondaySlots.first().startTime)
        assertEquals(LocalTime.of(14, 0), mondaySlots.last().endTime)

        // Verificar que ninguna franja coincida con el recreo 11:30 a 12:00
        val recessSlots = slots.filter { it.startTime == LocalTime.of(11, 30) }
        assertTrue(recessSlots.isEmpty(), "No deben generarse franjas lectivas durante el recreo")
    }

    @Test
    fun `generateTimeSlots - Edge Case handles customized hours and safely falls back on corrupted string formats`() {
        val config = createDefaultConfig().copy(
            horaInicioClases = "invalid-time",
            horaFinClases = "corrupted",
            horaInicioRecreo = "11:30",
            duracionRecreo = 0
        )
        val slots = SolverLessonDataLoader.generateTimeSlots(config)
        assertTrue(slots.isNotEmpty(), "Debe usar fallback seguro de 09:00 a 14:00")
    }
}
