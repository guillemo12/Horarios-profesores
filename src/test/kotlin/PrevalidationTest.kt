package com.colegio

import com.colegio.DTO.Configuracion
import com.colegio.solver.*
import java.time.DayOfWeek
import java.time.LocalTime
import java.util.UUID
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class PrevalidationTest {

    private fun createStandardSlots(): List<TimeSlot> {
        val days = listOf(DayOfWeek.MONDAY, DayOfWeek.TUESDAY, DayOfWeek.WEDNESDAY, DayOfWeek.THURSDAY, DayOfWeek.FRIDAY)
        val slots = mutableListOf<TimeSlot>()
        var counter = 1
        for (day in days) {
            var curr = LocalTime.of(9, 0)
            // 11 slots de 30 min (5.5h lectivas al día = 27.5h semanales)
            for (i in 1..11) {
                val end = curr.plusMinutes(30)
                slots.add(TimeSlot(id = "S_${counter++}", dayOfWeek = day, startTime = curr, endTime = end, duracionMinutos = 30, indiceDeFranja = i))
                curr = end
            }
        }
        return slots
    }

    @Test
    fun `test 1 - pin conflict detection when two lessons share same slot and teacher`() {
        val slots = createStandardSlots()
        val tutor1 = Profesor(nombre = "Tutor 1", asignaturas = listOf("Matemáticas"), asignaturasPreferidas = emptyList(), minutosMaximos = 1350)
        val g1 = Grupo(curso = "1º", nombre = "A", tutor = tutor1)
        val g2 = Grupo(curso = "2º", nombre = "A", tutor = tutor1)

        val slot = slots[0]
        val pinnedLesson1 = Leccion(id = "L1", asignatura = "Matemáticas", grupo = g1, minutosSemanales = 30, profesorFijo = tutor1).apply {
            isPinned = true
            timeSlot = slot
            profesor = tutor1
        }
        val pinnedLesson2 = Leccion(id = "L2", asignatura = "Matemáticas", grupo = g2, minutosSemanales = 30, profesorFijo = tutor1).apply {
            isPinned = true
            timeSlot = slot
            profesor = tutor1
        }

        val config = Configuracion(respetarEspecialidad = true, respetarLimiteHoras = true)
        val report = Prevalidation.generarReportePrevalidacion(listOf(pinnedLesson1, pinnedLesson2), slots, listOf(tutor1), config)

        assertFalse(report.viable, "El reporte debe ser inviable ante colisión de PINs")
        val pinCheck = report.checks.find { it.name.contains("Pin") }
        assertEquals("error", pinCheck?.status, "El chequeo de PIN debe tener estado 'error'")
        assertTrue(pinCheck?.details?.any { it.contains("Tutor 1") } == true, "Debe detallar el profesor en conflicto")
    }

    @Test
    fun `test 2 - group capacity overload when demanded hours exceed weekly slots`() {
        val slots = createStandardSlots() // 55 slots = 1650 min = 27.5h
        val tutor1 = Profesor(nombre = "Tutor 1", asignaturas = listOf("Matemáticas"), asignaturasPreferidas = emptyList(), minutosMaximos = 2000)
        val g1 = Grupo(curso = "1º", nombre = "A", tutor = tutor1)

        val lessons = mutableListOf<Leccion>()
        // 60 lecciones de 30m = 1800 min = 30.0h (> 27.5h)
        repeat(60) {
            lessons.add(Leccion(id = UUID.randomUUID().toString(), asignatura = "Matemáticas", grupo = g1, minutosSemanales = 30, profesorFijo = tutor1))
        }

        val config = Configuracion(tiempoMinimo = 30, respetarEspecialidad = true, respetarLimiteHoras = true)
        val report = Prevalidation.generarReportePrevalidacion(lessons, slots, listOf(tutor1), config)

        assertFalse(report.viable, "El reporte debe ser inviable por exceso de capacidad por grupo")
        val capCheck = report.checks.find { it.name.contains("Capacidad Horaria por Grupo") }
        assertEquals("error", capCheck?.status)
        assertTrue(capCheck?.details?.any { it.contains("1º A") } == true)
    }

    @Test
    fun `test 3 - uncovered specialty when a subject has no qualified teachers`() {
        val slots = createStandardSlots()
        val tutor1 = Profesor(nombre = "Tutor 1", asignaturas = listOf("Matemáticas"), asignaturasPreferidas = emptyList(), minutosMaximos = 1350)
        val g1 = Grupo(curso = "1º", nombre = "A", tutor = tutor1)

        val lessons = listOf(
            Leccion(id = "L_FR", asignatura = "Francés", grupo = g1, minutosSemanales = 30)
        )

        val config = Configuracion(respetarEspecialidad = true, respetarLimiteHoras = true)
        val report = Prevalidation.generarReportePrevalidacion(lessons, slots, listOf(tutor1), config)

        assertFalse(report.viable, "Debe ser inviable por falta de especialista en Francés")
        val specCheck = report.checks.find { it.name.contains("Cobertura de Especialidades") }
        assertEquals("error", specCheck?.status)
        assertTrue(specCheck?.details?.any { it.contains("Francés") } == true)
    }

    @Test
    fun `test 4 - teacher workload overload in Reparto Docente`() {
        val slots = createStandardSlots()
        val tutor1 = Profesor(nombre = "Tutor Sobrecargado", asignaturas = listOf("Matemáticas"), asignaturasPreferidas = emptyList(), minutosMaximos = 600) // 10h máx
        val g1 = Grupo(curso = "1º", nombre = "A", tutor = tutor1)

        val lessons = mutableListOf<Leccion>()
        // 30 lecciones de 30m = 900 min = 15h (> 10h máx)
        repeat(30) {
            lessons.add(Leccion(id = UUID.randomUUID().toString(), asignatura = "Matemáticas", grupo = g1, minutosSemanales = 30, profesorFijo = tutor1))
        }

        val config = Configuracion(tiempoMinimo = 30, respetarEspecialidad = true, respetarLimiteHoras = true)
        val report = Prevalidation.generarReportePrevalidacion(lessons, slots, listOf(tutor1), config)

        assertFalse(report.viable, "Debe ser inviable por sobrecarga de jornada en Reparto Docente")
        val loadCheck = report.checks.find { it.name.contains("Jornada y Carga") }
        assertEquals("error", loadCheck?.status)
        assertTrue(loadCheck?.details?.any { it.contains("Tutor Sobrecargado") && it.contains("+5.0h") } == true)
    }

    @Test
    fun `test 5 - global center capacity deficit`() {
        val slots = createStandardSlots()
        val tutor1 = Profesor(nombre = "Tutor 1", asignaturas = listOf("Matemáticas", "Lengua"), asignaturasPreferidas = emptyList(), minutosMaximos = 300) // 5h
        val g1 = Grupo(curso = "1º", nombre = "A", tutor = tutor1)

        val lessons = mutableListOf<Leccion>()
        // 20 lecciones de 30m = 600 min = 10h (> 5h plantilla total)
        repeat(20) {
            lessons.add(Leccion(id = UUID.randomUUID().toString(), asignatura = "Matemáticas", grupo = g1, minutosSemanales = 30))
        }

        val config = Configuracion(tiempoMinimo = 30, respetarEspecialidad = true, respetarLimiteHoras = true)
        val report = Prevalidation.generarReportePrevalidacion(lessons, slots, listOf(tutor1), config)

        assertFalse(report.viable, "Debe ser inviable por déficit global de la plantilla del centro")
        val balanceCheck = report.checks.find { it.name.contains("Balance Global de Plantilla") }
        assertEquals("error", balanceCheck?.status)
        assertTrue(balanceCheck?.message?.contains("Faltan 5.0h") == true)
    }

    @Test
    fun `test 6 - 100 percent balanced and viable scenario returns 5 ok checks`() {
        val slots = createStandardSlots()
        val tutor1 = Profesor(nombre = "Tutor 1", asignaturas = listOf("Matemáticas", "Lengua"), asignaturasPreferidas = emptyList(), minutosMaximos = 1350)
        val tutor2 = Profesor(nombre = "Tutor 2", asignaturas = listOf("Matemáticas", "Lengua"), asignaturasPreferidas = emptyList(), minutosMaximos = 1350)
        val g1 = Grupo(curso = "1º", nombre = "A", tutor = tutor1)
        val g2 = Grupo(curso = "2º", nombre = "A", tutor = tutor2)

        val lessons = mutableListOf<Leccion>()
        repeat(20) { lessons.add(Leccion(id = UUID.randomUUID().toString(), asignatura = "Matemáticas", grupo = g1, minutosSemanales = 30, profesorFijo = tutor1)) }
        repeat(20) { lessons.add(Leccion(id = UUID.randomUUID().toString(), asignatura = "Lengua", grupo = g2, minutosSemanales = 30, profesorFijo = tutor2)) }

        val config = Configuracion(tiempoMinimo = 30, respetarEspecialidad = true, respetarLimiteHoras = true)
        val report = Prevalidation.generarReportePrevalidacion(lessons, slots, listOf(tutor1, tutor2), config)

        assertTrue(report.viable, "Un escenario equilibrado debe ser viable")
        assertEquals(5, report.checks.size, "Debe contener los 5 chequeos")
        assertTrue(report.checks.all { it.status == "ok" }, "Todos los 5 chequeos deben estar en estado 'ok'")
    }
}
