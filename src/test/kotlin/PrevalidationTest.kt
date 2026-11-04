package com.colegio

import com.colegio.DTO.Configuracion
import com.colegio.solver.*
import java.time.DayOfWeek
import java.time.LocalTime
import java.util.UUID
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNotNull
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

    @Test
    fun `isTeacherQualified returns true when respetarEspecialidad is false`() {
        val teacher = Profesor(nombre = "Juan", asignaturas = listOf("Física"), asignaturasPreferidas = emptyList(), minutosMaximos = 1000)
        val config = Configuracion(respetarEspecialidad = false)

        val result = Prevalidation.isTeacherQualified(teacher, "Historia", config)
        assertTrue(result, "Debe retornar true si respetarEspecialidad es false, ignorando las asignaturas del docente")
    }

    @Test
    fun `isTeacherQualified when respetarEspecialidad is true and exact match`() {
        val teacher = Profesor(nombre = "María", asignaturas = listOf("Matemáticas", "Física"), asignaturasPreferidas = emptyList(), minutosMaximos = 1000)
        val config = Configuracion(respetarEspecialidad = true)

        assertTrue(Prevalidation.isTeacherQualified(teacher, "Matemáticas", config))
        assertTrue(Prevalidation.isTeacherQualified(teacher, "Física", config))
    }

    @Test
    fun `isTeacherQualified handles case insensitive matching and whitespace trimming`() {
        val teacher = Profesor(nombre = "Carlos", asignaturas = listOf("  Biología  ", "Química"), asignaturasPreferidas = emptyList(), minutosMaximos = 1000)
        val config = Configuracion(respetarEspecialidad = true)

        assertTrue(Prevalidation.isTeacherQualified(teacher, "biología", config))
        assertTrue(Prevalidation.isTeacherQualified(teacher, "  QUÍMICA  ", config))
    }

    @Test
    fun `isTeacherQualified handles substring matching in both directions`() {
        val teacher = Profesor(nombre = "Ana", asignaturas = listOf("Matemáticas", "Lengua Castellana y Literatura"), asignaturasPreferidas = emptyList(), minutosMaximos = 1000)
        val config = Configuracion(respetarEspecialidad = true)

        // Asignatura del profesor contenida en la asignatura buscada ("Matemáticas" dentro de "Matemáticas II")
        assertTrue(Prevalidation.isTeacherQualified(teacher, "Matemáticas II", config))

        // Asignatura buscada contenida en la asignatura del profesor ("Lengua" dentro de "Lengua Castellana y Literatura")
        assertTrue(Prevalidation.isTeacherQualified(teacher, "Lengua", config))
    }

    @Test
    fun `isTeacherQualified returns false when teacher has no matching subjects`() {
        val teacher = Profesor(nombre = "Pedro", asignaturas = listOf("Historia", "Geografía"), asignaturasPreferidas = emptyList(), minutosMaximos = 1000)
        val config = Configuracion(respetarEspecialidad = true)

        assertFalse(Prevalidation.isTeacherQualified(teacher, "Matemáticas", config))
    }

    @Test
    fun `isTeacherQualified returns false when teacher has empty subjects list`() {
        val teacher = Profesor(nombre = "SinEspecialidad", asignaturas = emptyList(), asignaturasPreferidas = emptyList(), minutosMaximos = 1000)
        val config = Configuracion(respetarEspecialidad = true)

        assertFalse(Prevalidation.isTeacherQualified(teacher, "Matemáticas", config))
    }

    @Test
    fun `specialty coverage check - happy path with multiple subjects and groups`() {
        val slots = createStandardSlots()
        val t1 = Profesor(nombre = "Prof 1", asignaturas = listOf("Matemáticas", "Física"), asignaturasPreferidas = emptyList(), minutosMaximos = 3000)
        val t2 = Profesor(nombre = "Prof 2", asignaturas = listOf("Lengua", "Inglés"), asignaturasPreferidas = emptyList(), minutosMaximos = 3000)
        val g1 = Grupo(curso = "1º", nombre = "A", tutor = t1)
        val g2 = Grupo(curso = "2º", nombre = "B", tutor = t2)

        val lessons = listOf(
            Leccion(id = "L1", asignatura = "Matemáticas", grupo = g1, minutosSemanales = 30),
            Leccion(id = "L2", asignatura = "Física", grupo = g1, minutosSemanales = 30),
            Leccion(id = "L3", asignatura = "Lengua", grupo = g2, minutosSemanales = 30),
            Leccion(id = "L4", asignatura = "Inglés", grupo = g2, minutosSemanales = 30)
        )

        val config = Configuracion(tiempoMinimo = 30, respetarEspecialidad = true, respetarLimiteHoras = true)
        val report = Prevalidation.generarReportePrevalidacion(lessons, slots, listOf(t1, t2), config)

        val specCheck = report.checks.find { it.name.contains("Cobertura de Especialidades") }
        assertNotNull(specCheck)
        assertEquals("ok", specCheck.status)
        assertTrue(specCheck.details.isEmpty())
    }

    @Test
    fun `specialty coverage check - edge path with multiple uncovered subjects and affected groups`() {
        val slots = createStandardSlots()
        val t1 = Profesor(nombre = "Prof 1", asignaturas = listOf("Matemáticas"), asignaturasPreferidas = emptyList(), minutosMaximos = 3000)
        val g1 = Grupo(curso = "1º", nombre = "A", tutor = t1)
        val g2 = Grupo(curso = "2º", nombre = "B", tutor = t1)

        val lessons = listOf(
            Leccion(id = "L1", asignatura = "Matemáticas", grupo = g1, minutosSemanales = 30),
            Leccion(id = "L2", asignatura = "Robótica Advanced", grupo = g1, minutosSemanales = 30),
            Leccion(id = "L3", asignatura = "Robótica Advanced", grupo = g2, minutosSemanales = 30)
        )

        val config = Configuracion(tiempoMinimo = 30, respetarEspecialidad = true, respetarLimiteHoras = true)
        val report = Prevalidation.generarReportePrevalidacion(lessons, slots, listOf(t1), config)

        val specCheck = report.checks.find { it.name.contains("Cobertura de Especialidades") }
        assertNotNull(specCheck)
        assertEquals("error", specCheck.status)
        assertEquals(1, specCheck.details.size)
        assertTrue(specCheck.details[0].contains("Robótica Advanced"))
        assertTrue(specCheck.details[0].contains("1º A"))
        assertTrue(specCheck.details[0].contains("2º B"))
    }

    @Test
    fun `benchmark prevalidation teacher qualification performance with large dataset`() {
        val slots = createStandardSlots()
        val teachers = (1..100).map { i ->
            Profesor(
                nombre = "Profesor $i",
                asignaturas = listOf("Asignatura_${i % 40}", "Especialidad_${i % 10}"),
                asignaturasPreferidas = emptyList(),
                minutosMaximos = 100000
            )
        }
        val groups = (1..20).map { i ->
            Grupo(curso = "${(i % 4) + 1}º", nombre = "Grupo_$i", tutor = teachers[i % teachers.size])
        }

        val lessons = (1..5000).map { i ->
            val group = groups[i % groups.size]
            val asig = "Asignatura_${i % 50}"
            Leccion(
                id = "L_$i",
                asignatura = asig,
                grupo = group,
                minutosSemanales = 30
            )
        }

        val config = Configuracion(tiempoMinimo = 30, respetarEspecialidad = true, respetarLimiteHoras = false)

        // Warmup
        repeat(3) {
            Prevalidation.generarReportePrevalidacion(lessons, slots, teachers, config)
        }

        val iterations = 20
        val startTime = System.currentTimeMillis()
        repeat(iterations) {
            Prevalidation.generarReportePrevalidacion(lessons, slots, teachers, config)
        }
        val totalMs = System.currentTimeMillis() - startTime
        val avgMs = totalMs.toDouble() / iterations

        println("=== PREVALIDATION BENCHMARK BASELINE ===")
        println("Dataset: 5000 lessons, 50 subjects, 100 teachers, 20 groups")
        println("Executed $iterations iterations in ${totalMs}ms (Avg: ${avgMs}ms / iter)")
    }
}
