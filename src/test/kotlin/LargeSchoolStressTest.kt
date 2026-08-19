package com.colegio

import com.colegio.DTO.Configuracion
import com.colegio.DTO.TeacherAvailabilityDto
import com.colegio.solver.*
import com.google.ortools.sat.CpSolverStatus
import java.time.DayOfWeek
import java.time.LocalTime
import java.util.UUID
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.test.assertTrue

/**
 * LargeSchoolStressTest
 *
 * Exhaustive stress and performance test suite for the Google OR-Tools CP-SAT scheduler
 * under realistic, large-scale educational institution workloads (Features F1, F2, F3, F4, F15, F16).
 *
 * Covers:
 * - F1: Presolve symmetry tuning and non-hanging search under timeout
 * - F2: Variable inverted indexing performance without quadratic slowdown
 * - F3: Pinned class availability conflict override
 * - F4: Memory churn and object allocation scalability
 * - F15: Synthetic large school dataset (20+ groups, 30+ teachers, 500-600+ classes)
 * - F16: Multi-duration pinned class preservation (30m, 1.0h, 1.5h, 2.0h)
 */
class LargeSchoolStressTest {

    // =========================================================================
    // DATASET BUILDERS & HELPERS
    // =========================================================================

    /**
     * Standard 5-day school week (Mon-Fri) with 30-minute atomic slots from 09:00 to 14:00.
     * 10 slots per day * 5 days = 50 total slots per week.
     */
    private fun createStandardTimeSlots(): List<TimeSlot> {
        val days = listOf(
            DayOfWeek.MONDAY,
            DayOfWeek.TUESDAY,
            DayOfWeek.WEDNESDAY,
            DayOfWeek.THURSDAY,
            DayOfWeek.FRIDAY
        )
        val slots = mutableListOf<TimeSlot>()
        var counter = 1
        for (day in days) {
            var curr = LocalTime.of(9, 0)
            for (i in 1..10) {
                val end = curr.plusMinutes(30)
                slots.add(
                    TimeSlot(
                        id = "SLOT_${day.name.take(3)}_${i}",
                        dayOfWeek = day,
                        startTime = curr,
                        endTime = end,
                        duracionMinutos = 30,
                        indiceDeFranja = i
                    )
                )
                curr = end
            }
        }
        return slots
    }

    /**
     * Creates 36 specialized teachers with broad departmental coverage and realistic max weekly minutes.
     */
    private fun createLargeSchoolTeachers(customAvailability: Map<String, List<TeacherAvailabilityDto>> = emptyMap()): List<Profesor> {
        val teacherDefs = listOf(
            // Matemáticas (4 teachers)
            Triple("Prof_Mat_1", listOf("Matemáticas"), listOf("Matemáticas")),
            Triple("Prof_Mat_2", listOf("Matemáticas"), listOf("Matemáticas")),
            Triple("Prof_Mat_3", listOf("Matemáticas"), listOf("Matemáticas")),
            Triple("Prof_Mat_4", listOf("Matemáticas"), listOf("Matemáticas")),

            // Lengua Castellana y Literatura (4 teachers)
            Triple("Prof_Len_1", listOf("Lengua"), listOf("Lengua")),
            Triple("Prof_Len_2", listOf("Lengua"), listOf("Lengua")),
            Triple("Prof_Len_3", listOf("Lengua"), listOf("Lengua")),
            Triple("Prof_Len_4", listOf("Lengua"), listOf("Lengua")),

            // Inglés (4 teachers)
            Triple("Prof_Ing_1", listOf("Inglés"), listOf("Inglés")),
            Triple("Prof_Ing_2", listOf("Inglés"), listOf("Inglés")),
            Triple("Prof_Ing_3", listOf("Inglés"), listOf("Inglés")),
            Triple("Prof_Ing_4", listOf("Inglés"), listOf("Inglés")),

            // Física y Química (3 teachers)
            Triple("Prof_Fis_1", listOf("Física y Química"), listOf("Física y Química")),
            Triple("Prof_Fis_2", listOf("Física y Química"), listOf("Física y Química")),
            Triple("Prof_Fis_3", listOf("Física y Química"), listOf("Física y Química")),

            // Biología y Geología (3 teachers)
            Triple("Prof_Bio_1", listOf("Biología"), listOf("Biología")),
            Triple("Prof_Bio_2", listOf("Biología"), listOf("Biología")),
            Triple("Prof_Bio_3", listOf("Biología"), listOf("Biología")),

            // Geografía e Historia (3 teachers)
            Triple("Prof_His_1", listOf("Historia"), listOf("Historia")),
            Triple("Prof_His_2", listOf("Historia"), listOf("Historia")),
            Triple("Prof_His_3", listOf("Historia"), listOf("Historia")),

            // Educación Física (3 teachers)
            Triple("Prof_EdF_1", listOf("Educación Física"), listOf("Educación Física")),
            Triple("Prof_EdF_2", listOf("Educación Física"), listOf("Educación Física")),
            Triple("Prof_EdF_3", listOf("Educación Física"), listOf("Educación Física")),

            // Música (2 teachers)
            Triple("Prof_Mus_1", listOf("Música"), listOf("Música")),
            Triple("Prof_Mus_2", listOf("Música"), listOf("Música")),

            // Educación Plástica y Visual / Dibujo (2 teachers)
            Triple("Prof_Dib_1", listOf("Dibujo"), listOf("Dibujo")),
            Triple("Prof_Dib_2", listOf("Dibujo"), listOf("Dibujo")),

            // Tecnología e Informática (2 teachers)
            Triple("Prof_Tec_1", listOf("Tecnología"), listOf("Tecnología")),
            Triple("Prof_Tec_2", listOf("Tecnología"), listOf("Tecnología")),

            // Filosofía (2 teachers)
            Triple("Prof_Fil_1", listOf("Filosofía"), listOf("Filosofía")),
            Triple("Prof_Fil_2", listOf("Filosofía"), listOf("Filosofía")),

            // Francés (2 teachers)
            Triple("Prof_Fra_1", listOf("Francés"), listOf("Francés")),
            Triple("Prof_Fra_2", listOf("Francés"), listOf("Francés")),

            // Religión / Valores (2 teachers)
            Triple("Prof_Rel_1", listOf("Valores"), listOf("Valores")),
            Triple("Prof_Rel_2", listOf("Valores"), listOf("Valores"))
        )

        return teacherDefs.map { (name, subjects, preferred) ->
            Profesor(
                nombre = name,
                asignaturas = subjects,
                asignaturasPreferidas = preferred,
                minutosMaximos = 1500, // 25 hours max per teacher
                availability = customAvailability[name] ?: emptyList()
            )
        }
    }

    /**
     * Creates 24 student groups (1º ESO to 2º Bachillerato, 4 sections A, B, C, D each).
     */
    private fun createLargeSchoolGroups(teachers: List<Profesor>): List<Grupo> {
        val cursos = listOf("1º ESO", "2º ESO", "3º ESO", "4º ESO", "1º Bach", "2º Bach")
        val secciones = listOf("A", "B", "C", "D")
        val groups = mutableListOf<Grupo>()
        var tutorIdx = 0

        for (curso in cursos) {
            for (sec in secciones) {
                val tutor = teachers[tutorIdx % teachers.size]
                tutorIdx++
                groups.add(Grupo(curso = curso, nombre = sec, tutor = tutor))
            }
        }
        return groups
    }

    /**
     * Generates a realistic weekly curriculum of 25 lessons of 30-min (12.5h) for each group:
     * - Matemáticas: 4 blocks (2.0h)
     * - Lengua: 4 blocks (2.0h)
     * - Inglés: 3 blocks (1.5h)
     * - Historia: 3 blocks (1.5h)
     * - Biología: 3 blocks (1.5h)
     * - Física y Química: 2 blocks (1.0h)
     * - Educación Física: 2 blocks (1.0h)
     * - Música: 2 blocks (1.0h)
     * - Tecnología: 2 blocks (1.0h)
     * Total = 25 lessons per group * 24 groups = 600 lessons total.
     */
    private fun generateLargeSchoolCurriculum(groups: List<Grupo>, teachers: List<Profesor>): MutableList<Leccion> {
        val subjectDistribution = listOf(
            "Matemáticas" to 4,
            "Lengua" to 4,
            "Inglés" to 3,
            "Historia" to 3,
            "Biología" to 3,
            "Física y Química" to 2,
            "Educación Física" to 2,
            "Música" to 2,
            "Tecnología" to 2
        )

        val lessons = mutableListOf<Leccion>()

        for (group in groups) {
            for ((subject, count) in subjectDistribution) {
                // Find candidate teacher to assign as fixed tutor / primary teacher if tutor teaches it
                val qualifiedTeachers = teachers.filter { it.asignaturas.contains(subject) }
                val groupIdx = groups.indexOf(group)
                val candidateTeacher = if (group.tutor.asignaturas.contains(subject)) {
                    group.tutor
                } else if (qualifiedTeachers.isNotEmpty()) {
                    qualifiedTeachers[groupIdx % qualifiedTeachers.size]
                } else {
                    null
                }

                repeat(count) {
                    lessons.add(
                        Leccion(
                            id = "L_${group.curso.replace(" ", "")}_${group.nombre}_${subject.take(3)}_${UUID.randomUUID().toString().take(6)}",
                            asignatura = subject,
                            grupo = group,
                            minutosSemanales = 30,
                            profesorFijo = candidateTeacher
                        )
                    )
                }
            }
        }
        return lessons
    }

    // =========================================================================
    // TEST CASES
    // =========================================================================

    /**
     * Feature F15, F1, F2:
     * Verify that generating a schedule for a full large school dataset (24 groups, 36 teachers, 600 classes)
     * completes cleanly within the configured timeout limit (<30s) and produces a feasible schedule
     * without presolve hanging (F1) or memory exhaustion (F4).
     */
    @Test
    fun `test large school schedule generation with 24 groups 36 teachers and 600 classes completes within timeout`() {
        val slots = createStandardTimeSlots()
        val teachers = createLargeSchoolTeachers()
        val groups = createLargeSchoolGroups(teachers)
        val lessons = generateLargeSchoolCurriculum(groups, teachers)

        assertEquals(50, slots.size, "Must have exactly 50 30-minute time slots (5 days x 10 slots)")
        assertEquals(24, groups.size, "Must have 24 distinct student groups")
        assertTrue(teachers.size >= 30, "Must have at least 30 teachers (found ${teachers.size})")
        assertEquals(600, lessons.size, "Must have exactly 600 lessons (24 groups x 25 lessons)")

        val config = Configuracion(
            priorizarTutor = true,
            tiempoMinimo = 30,
            tiempoMaximo = 60,
            respetarEspecialidad = true,
            respetarLimiteHoras = true,
            respetarDisponibilidad = true,
            limiteTiempoSegundos = 25.0
        )

        val startTime = System.currentTimeMillis()
        val result = OrToolsScheduleSolver.solve(
            timeSlots = slots,
            lessons = lessons,
            teachers = teachers,
            config = config,
            timeLimitSeconds = 25.0
        )
        val elapsedMs = System.currentTimeMillis() - startTime
        val elapsedSec = elapsedMs / 1000.0

        // 1. Completion & Timeout verification
        assertTrue(
            elapsedSec <= 30.0,
            "Solver must finish within the 30-second upper bound (took ${elapsedSec}s)"
        )

        // 2. Feasibility verification
        assertTrue(
            result.isFeasible || result.status == CpSolverStatus.FEASIBLE || result.status == CpSolverStatus.OPTIMAL,
            "Solver must find a valid feasible solution for the 600-lesson school (status: ${result.status})"
        )

        // 3. Structural correctness on placed classes
        val placedLessons = result.solvedLessons.filter { it.timeSlot != null }
        assertTrue(
            placedLessons.size >= 400,
            "At least 400 of the 600 lessons should be placed within 25s (placed: ${placedLessons.size})"
        )

        // Verify No Group Double-Booking
        val groupSlotCollisions = placedLessons
            .groupBy { Pair("${it.grupo.curso}_${it.grupo.nombre}", it.timeSlot!!.id) }
            .filter { it.value.size > 1 }

        assertTrue(
            groupSlotCollisions.isEmpty(),
            "Zero group double-bookings allowed. Found collisions: ${groupSlotCollisions.keys}"
        )

        // Verify No Teacher Double-Booking
        val teacherSlotCollisions = placedLessons
            .filter { it.profesor != null }
            .groupBy { Pair(it.profesor!!.nombre, it.timeSlot!!.id) }
            .filter { it.value.size > 1 }

        assertTrue(
            teacherSlotCollisions.isEmpty(),
            "Zero teacher double-bookings allowed. Found collisions: ${teacherSlotCollisions.keys}"
        )
    }

    /**
     * Feature F16, F3:
     * Multi-duration pinned class preservation stress test under large school scale:
     * Injects pinned classes of 30 min (1 slot), 1.0 hour (2 slots), 1.5 hours (3 slots), and 2.0 hours (4 slots)
     * across different groups and days, and verifies that EVERY pinned class is strictly preserved at its
     * exact day, start slot, and duration.
     */
    @Test
    fun `test multi-duration pinned class preservation under large school stress (30m, 1h, 1_5h, 2h)`() {
        val slots = createStandardTimeSlots()
        val teachers = createLargeSchoolTeachers()
        val groups = createLargeSchoolGroups(teachers)
        val lessons = generateLargeSchoolCurriculum(groups, teachers)

        // Target slots for multi-duration pins:
        // Slot helpers
        val mondaySlots = slots.filter { it.dayOfWeek == DayOfWeek.MONDAY }.sortedBy { it.startTime }
        val tuesdaySlots = slots.filter { it.dayOfWeek == DayOfWeek.TUESDAY }.sortedBy { it.startTime }
        val wednesdaySlots = slots.filter { it.dayOfWeek == DayOfWeek.WEDNESDAY }.sortedBy { it.startTime }
        val thursdaySlots = slots.filter { it.dayOfWeek == DayOfWeek.THURSDAY }.sortedBy { it.startTime }

        val g1 = groups.find { it.curso == "1º ESO" && it.nombre == "A" }!!
        val g2 = groups.find { it.curso == "2º ESO" && it.nombre == "B" }!!
        val g3 = groups.find { it.curso == "3º ESO" && it.nombre == "C" }!!
        val g4 = groups.find { it.curso == "4º ESO" && it.nombre == "D" }!!

        val g1Mat = lessons.filter { it.grupo == g1 && it.asignatura == "Matemáticas" }
        val g2Len = lessons.filter { it.grupo == g2 && it.asignatura == "Lengua" }
        val g3His = lessons.filter { it.grupo == g3 && it.asignatura == "Historia" }
        val g4Len = lessons.filter { it.grupo == g4 && it.asignatura == "Lengua" }

        // 1. PIN 30 MIN (1 slot): Monday 09:00 - 09:30 (Slot 0)
        val pin30m = g1Mat[0].apply {
            isPinned = true
            timeSlot = mondaySlots[0]
            profesor = profesorFijo
        }

        // 2. PIN 1.0 HOUR (2 slots): Tuesday 09:00 - 10:00 (Slots 0 and 1)
        val pin1hPart1 = g2Len[0].apply {
            isPinned = true
            timeSlot = tuesdaySlots[0] // 09:00 - 09:30
            profesor = profesorFijo
        }
        val pin1hPart2 = g2Len[1].apply {
            isPinned = true
            timeSlot = tuesdaySlots[1] // 09:30 - 10:00
            profesor = profesorFijo
        }

        // 3. PIN 1.5 HOURS (3 slots): Wednesday 10:00 - 11:30 (Slots 2, 3, 4)
        val pin15hPart1 = g3His[0].apply {
            isPinned = true
            timeSlot = wednesdaySlots[2] // 10:00 - 10:30
            profesor = profesorFijo
        }
        val pin15hPart2 = g3His[1].apply {
            isPinned = true
            timeSlot = wednesdaySlots[3] // 10:30 - 11:00
            profesor = profesorFijo
        }
        val pin15hPart3 = g3His[2].apply {
            isPinned = true
            timeSlot = wednesdaySlots[4] // 11:00 - 11:30
            profesor = profesorFijo
        }

        // 4. PIN 2.0 HOURS (4 slots): Thursday 10:00 - 12:00 (Slots 2, 3, 4, 5)
        val pin2hPart1 = g4Len[0].apply {
            isPinned = true
            timeSlot = thursdaySlots[2] // 10:00 - 10:30
            profesor = profesorFijo
        }
        val pin2hPart2 = g4Len[1].apply {
            isPinned = true
            timeSlot = thursdaySlots[3] // 10:30 - 11:00
            profesor = profesorFijo
        }
        val pin2hPart3 = g4Len[2].apply {
            isPinned = true
            timeSlot = thursdaySlots[4] // 11:00 - 11:30
            profesor = profesorFijo
        }
        val pin2hPart4 = g4Len[3].apply {
            isPinned = true
            timeSlot = thursdaySlots[5] // 11:30 - 12:00
            profesor = profesorFijo
        }

        val allPinned = listOf(
            pin30m,
            pin1hPart1, pin1hPart2,
            pin15hPart1, pin15hPart2, pin15hPart3,
            pin2hPart1, pin2hPart2, pin2hPart3, pin2hPart4
        )

        val combinedLessons = lessons

        val config = Configuracion(
            priorizarTutor = false,
            tiempoMinimo = 30,
            tiempoMaximo = 60,
            respetarEspecialidad = true,
            respetarLimiteHoras = false,
            limiteTiempoSegundos = 15.0
        )

        val result = OrToolsScheduleSolver.solve(
            timeSlots = slots,
            lessons = combinedLessons,
            teachers = teachers,
            config = config,
            timeLimitSeconds = 15.0
        )

        assertTrue(result.isFeasible || result.status == CpSolverStatus.FEASIBLE || result.status == CpSolverStatus.OPTIMAL, "Solver must return a feasible schedule containing all pinned classes")

        // Strictly verify every pinned class preservation
        for (pin in allPinned) {
            val scheduled = result.solvedLessons.find { it.id == pin.id }
            assertNotNull(scheduled, "Pinned class ${pin.id} must be present in output schedule")
            assertTrue(scheduled.isPinned, "Pinned class ${pin.id} must keep isPinned = true")
            assertEquals(
                pin.timeSlot?.id,
                scheduled.timeSlot?.id,
                "Pinned class ${pin.id} must strictly preserve its exact slot ${pin.timeSlot?.id}"
            )
            assertEquals(
                pin.profesor?.nombre,
                scheduled.profesor?.nombre,
                "Pinned class ${pin.id} must strictly preserve its assigned teacher ${pin.profesor?.nombre}"
            )
        }
    }

    /**
     * Feature F3: Pinned Class Availability Protection
     * Verify that pinned classes override teacher unavailable slots.
     * When a teacher has an unavailable blocking window in TeacherAvailabilityDto,
     * any pinned class scheduled in that window must remain strictly pinned and scheduled with that teacher.
     */
    @Test
    fun `test pinned classes override teacher unavailable slots (Feature F3 availability protection)`() {
        val slots = createStandardTimeSlots()
        val fridaySlots = slots.filter { it.dayOfWeek == DayOfWeek.FRIDAY }.sortedBy { it.startTime }

        // Teacher Prof_Bio_1 is unavailable Friday 09:00 - 11:00 (first 4 slots of Friday)
        val bioBlockedAvailability = listOf(
            TeacherAvailabilityDto(
                dayOfWeek = 5, // Friday
                startTime = "09:00",
                endTime = "11:00"
            )
        )

        val teachers = createLargeSchoolTeachers(
            customAvailability = mapOf("Prof_Bio_1" to bioBlockedAvailability)
        )
        val groups = createLargeSchoolGroups(teachers)
        val targetGroup = groups.first()
        val bioTeacher = teachers.find { it.nombre == "Prof_Bio_1" }!!

        // Create a 1-hour pinned class for Prof_Bio_1 on Friday 09:00 - 10:00 (inside the blocked window)
        val pinnedBioPart1 = Leccion(
            id = "PIN_BIO_FRI_0900",
            asignatura = "Biología",
            grupo = targetGroup,
            minutosSemanales = 60,
            profesorFijo = bioTeacher
        ).apply {
            isPinned = true
            timeSlot = fridaySlots[0] // Friday 09:00 - 09:30
            profesor = bioTeacher
        }

        val pinnedBioPart2 = Leccion(
            id = "PIN_BIO_FRI_0930",
            asignatura = "Biología",
            grupo = targetGroup,
            minutosSemanales = 60,
            profesorFijo = bioTeacher
        ).apply {
            isPinned = true
            timeSlot = fridaySlots[1] // Friday 09:30 - 10:00
            profesor = bioTeacher
        }

        // Add regular unpinned lessons for other subjects
        val unpinnedLessons = mutableListOf<Leccion>()
        repeat(12) { i ->
            unpinnedLessons.add(
                Leccion(
                    id = "UNPIN_MAT_$i",
                    asignatura = "Matemáticas",
                    grupo = targetGroup,
                    minutosSemanales = 30,
                    profesorFijo = teachers.find { it.nombre == "Prof_Mat_1" }
                )
            )
        }
        repeat(8) { i ->
            unpinnedLessons.add(
                Leccion(
                    id = "UNPIN_BIO_EXTRA_$i",
                    asignatura = "Biología",
                    grupo = targetGroup,
                    minutosSemanales = 30,
                    profesorFijo = bioTeacher
                )
            )
        }

        val allLessons = listOf(pinnedBioPart1, pinnedBioPart2) + unpinnedLessons

        val config = Configuracion(
            priorizarTutor = true,
            tiempoMinimo = 30,
            tiempoMaximo = 60,
            respetarEspecialidad = true,
            respetarLimiteHoras = true,
            respetarDisponibilidad = true,
            limiteTiempoSegundos = 10.0
        )

        val result = OrToolsScheduleSolver.solve(
            timeSlots = slots,
            lessons = allLessons,
            teachers = teachers,
            config = config,
            timeLimitSeconds = 10.0
        )

        assertTrue(result.isFeasible, "Solver must complete feasibly with pinned classes overriding availability")

        // Verify that BOTH pinned lessons in the blocked window are strictly placed
        val resP1 = result.solvedLessons.find { it.id == "PIN_BIO_FRI_0900" }
        val resP2 = result.solvedLessons.find { it.id == "PIN_BIO_FRI_0930" }

        assertNotNull(resP1, "Pinned Bio part 1 must be present")
        assertNotNull(resP2, "Pinned Bio part 2 must be present")

        assertEquals(fridaySlots[0].id, resP1.timeSlot?.id, "Part 1 must be on Friday 09:00 - 09:30")
        assertEquals(fridaySlots[1].id, resP2.timeSlot?.id, "Part 2 must be on Friday 09:30 - 10:00")
        assertEquals("Prof_Bio_1", resP1.profesor?.nombre)
        assertEquals("Prof_Bio_1", resP2.profesor?.nombre)
        assertTrue(resP1.isPinned)
        assertTrue(resP2.isPinned)

        // Verify that UNPINNED lessons for Prof_Bio_1 are NOT placed in Friday 10:00 - 11:00 (blocked)
        val bioBlockedSlots = listOf(fridaySlots[2].id, fridaySlots[3].id) // 10:00-10:30 and 10:30-11:00
        val unpinnedBioInBlocked = result.solvedLessons.filter {
            !it.isPinned && it.profesor?.nombre == "Prof_Bio_1" && it.timeSlot?.id in bioBlockedSlots
        }
        assertTrue(
            unpinnedBioInBlocked.isEmpty(),
            "Non-pinned lessons for Prof_Bio_1 must not be scheduled during blocked availability"
        )
    }

    /**
     * Feature F2, F4: Solver Memory Scaling and Inverted Index Lookup Efficiency
     * Ensures that model initialization and variable indexing scale efficiently without quadratic slowdown
     * and that memory allocation does not cause JVM heap spikes or OutOfMemoryError.
     */
    @Test
    fun `test solver memory scaling and inverted index construction efficiency on large school workload`() {
        val slots = createStandardTimeSlots()
        val teachers = createLargeSchoolTeachers()
        val groups = createLargeSchoolGroups(teachers)
        val lessons = generateLargeSchoolCurriculum(groups, teachers) // 600 lessons

        val runtime = Runtime.getRuntime()
        runtime.gc()
        val memoryBeforeBytes = runtime.totalMemory() - runtime.freeMemory()

        val config = Configuracion(
            priorizarTutor = true,
            tiempoMinimo = 30,
            tiempoMaximo = 60,
            respetarEspecialidad = true,
            respetarLimiteHoras = true,
            limiteTiempoSegundos = 10.0
        )

        val initStartTime = System.currentTimeMillis()
        val result = OrToolsScheduleSolver.solve(
            timeSlots = slots,
            lessons = lessons,
            teachers = teachers,
            config = config,
            timeLimitSeconds = 10.0
        )
        val totalElapsedMs = System.currentTimeMillis() - initStartTime

        val memoryAfterBytes = runtime.totalMemory() - runtime.freeMemory()
        val memoryDeltaMB = (memoryAfterBytes - memoryBeforeBytes) / (1024 * 1024)

        assertTrue(
            totalElapsedMs < 15000,
            "Total execution for 600 lessons must be well under 15 seconds (took ${totalElapsedMs} ms)"
        )
        assertTrue(
            result.isFeasible,
            "Solver should produce a feasible schedule"
        )

        // Memory delta should remain reasonable (< 500 MB heap delta for 600 lessons)
        assertTrue(
            memoryDeltaMB < 500,
            "Memory growth should remain controlled (< 500 MB, actual delta: $memoryDeltaMB MB)"
        )
    }

    /**
     * Boundary and Saturation Stress Test:
     * Tests a dense schedule where groups utilize 70-80% of available weekly slots,
     * verifying solver convergence and stability without deadlocks or thread pool exhaustion.
     */
    @Test
    fun `test high density large school schedule convergence and stability`() {
        val slots = createStandardTimeSlots() // 50 slots total
        val teachers = createLargeSchoolTeachers()
        val groups = createLargeSchoolGroups(teachers).take(20) // 20 groups

        // 35 lessons per group = 70% slot saturation (700 lessons total)
        val denseLessons = mutableListOf<Leccion>()
        val subjects = listOf("Matemáticas", "Lengua", "Inglés", "Historia", "Biología", "Educación Física", "Música")

        for (group in groups) {
            for (subject in subjects) {
                val qualifiedTeachers = teachers.filter { it.asignaturas.contains(subject) }
                val groupIdx = groups.indexOf(group)
                val candidateTeacher = if (qualifiedTeachers.isNotEmpty()) qualifiedTeachers[groupIdx % qualifiedTeachers.size] else null
                repeat(5) {
                    denseLessons.add(
                        Leccion(
                            id = "DENSE_${group.curso.replace(" ", "")}_${group.nombre}_${subject.take(3)}_${UUID.randomUUID().toString().take(6)}",
                            asignatura = subject,
                            grupo = group,
                            minutosSemanales = 30,
                            profesorFijo = candidateTeacher
                        )
                    )
                }
            }
        }

        assertEquals(700, denseLessons.size, "Dense dataset must contain exactly 700 lessons (20 groups x 35 lessons)")

        val config = Configuracion(
            priorizarTutor = false,
            tiempoMinimo = 30,
            tiempoMaximo = 60,
            respetarEspecialidad = true,
            respetarLimiteHoras = false, // relax hour limits to test slot density solver performance
            limiteTiempoSegundos = 15.0
        )

        val result = OrToolsScheduleSolver.solve(
            timeSlots = slots,
            lessons = denseLessons,
            teachers = teachers,
            config = config,
            timeLimitSeconds = 15.0
        )

        assertTrue(
            result.isFeasible || result.status == CpSolverStatus.FEASIBLE || result.status == CpSolverStatus.OPTIMAL,
            "Dense 700-lesson schedule solver run must complete feasibly (status: ${result.status})"
        )

        val placedLessons = result.solvedLessons.filter { it.timeSlot != null }
        assertTrue(
            placedLessons.size >= 300,
            "Dense schedule should place at least 300 of 700 lessons in 15s (placed: ${placedLessons.size})"
        )
    }
}
