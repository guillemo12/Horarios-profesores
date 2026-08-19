package com.colegio

import com.colegio.DTO.Configuracion
import com.colegio.modelos.entities.*
import com.colegio.modelos.tables.AsignaturaTable
import com.colegio.modelos.tables.RepartoDocenteTable
import com.colegio.solver.Grupo
import com.colegio.solver.Leccion
import com.colegio.solver.OrToolsScheduleSolver
import com.colegio.solver.Profesor
import com.colegio.solver.TimeSlot
import org.jetbrains.exposed.sql.Database
import org.jetbrains.exposed.sql.selectAll
import org.jetbrains.exposed.sql.transactions.transaction
import java.io.File
import java.time.DayOfWeek
import java.time.LocalTime
import java.util.UUID
import kotlin.test.Test
import kotlin.test.assertTrue

class ServerSolverTest {

    private fun createStandardSlots(): List<TimeSlot> {
        val days = listOf(DayOfWeek.MONDAY, DayOfWeek.TUESDAY, DayOfWeek.WEDNESDAY, DayOfWeek.THURSDAY, DayOfWeek.FRIDAY)
        val slots = mutableListOf<TimeSlot>()
        var counter = 1
        for (day in days) {
            var curr = LocalTime.of(9, 0)
            for (i in 1..9) {
                val end = curr.plusMinutes(30)
                slots.add(TimeSlot(id = "S_${counter++}", dayOfWeek = day, startTime = curr, endTime = end, duracionMinutos = 30, indiceDeFranja = i))
                curr = end
            }
        }
        return slots
    }

    @Test
    fun `test 1 - normal valid scenario generates feasible schedule`() {
        val slots = createStandardSlots()
        val tutor1 = Profesor(nombre = "Tutor 1", asignaturas = listOf("Matemáticas", "Lengua"), asignaturasPreferidas = emptyList(), minutosMaximos = 1350)
        val tutor2 = Profesor(nombre = "Tutor 2", asignaturas = listOf("Matemáticas", "Lengua"), asignaturasPreferidas = emptyList(), minutosMaximos = 1350)
        val profeEF = Profesor(nombre = "Profe EF", asignaturas = listOf("Educación Física"), asignaturasPreferidas = emptyList(), minutosMaximos = 1350)

        val g1 = Grupo(curso = "1º", nombre = "A", tutor = tutor1)
        val g2 = Grupo(curso = "2º", nombre = "A", tutor = tutor2)

        val lessons = mutableListOf<Leccion>()
        repeat(10) { lessons.add(Leccion(id = UUID.randomUUID().toString(), asignatura = "Matemáticas", grupo = g1, minutosSemanales = 300, profesorFijo = tutor1)) }
        repeat(10) { lessons.add(Leccion(id = UUID.randomUUID().toString(), asignatura = "Lengua", grupo = g1, minutosSemanales = 300, profesorFijo = tutor1)) }
        repeat(4) { lessons.add(Leccion(id = UUID.randomUUID().toString(), asignatura = "Educación Física", grupo = g1, minutosSemanales = 120, profesorFijo = profeEF)) }

        repeat(10) { lessons.add(Leccion(id = UUID.randomUUID().toString(), asignatura = "Matemáticas", grupo = g2, minutosSemanales = 300, profesorFijo = tutor2)) }
        repeat(10) { lessons.add(Leccion(id = UUID.randomUUID().toString(), asignatura = "Lengua", grupo = g2, minutosSemanales = 300, profesorFijo = tutor2)) }
        repeat(4) { lessons.add(Leccion(id = UUID.randomUUID().toString(), asignatura = "Educación Física", grupo = g2, minutosSemanales = 120, profesorFijo = profeEF)) }

        val config = Configuracion(priorizarTutor = true, tiempoMinimo = 30, tiempoMaximo = 60, respetarEspecialidad = true, respetarLimiteHoras = true)
        val result = OrToolsScheduleSolver.solve(slots, lessons, listOf(tutor1, tutor2, profeEF), config, timeLimitSeconds = 5.0)

        assertTrue(result.isFeasible, "El escenario normal debe ser FEASIBLE.")
    }

    @Test
    fun `test 2 - failure scenario due to teacher hours overload`() {
        val slots = createStandardSlots()
        val profeSobrecargado = Profesor(nombre = "Profe Sobrecargado", asignaturas = listOf("Matemáticas"), asignaturasPreferidas = emptyList(), minutosMaximos = 300)
        val g1 = Grupo(curso = "1º", nombre = "A", tutor = profeSobrecargado)

        val lessons = mutableListOf<Leccion>()
        repeat(20) { lessons.add(Leccion(id = UUID.randomUUID().toString(), asignatura = "Matemáticas", grupo = g1, minutosSemanales = 600, profesorFijo = profeSobrecargado)) }

        val config = Configuracion(priorizarTutor = true, tiempoMinimo = 30, tiempoMaximo = 60, respetarEspecialidad = true, respetarLimiteHoras = true)
        val result = OrToolsScheduleSolver.solve(slots, lessons, listOf(profeSobrecargado), config, timeLimitSeconds = 2.0)

        assertTrue(result.conflictos.isNotEmpty() || result.hardScore < 0, "El escenario con sobrecarga debe reportar conflictos o déficit.")
    }

    @Test
    fun `test 3 - failure scenario due to unassigned specialty`() {
        val slots = createStandardSlots()
        val tutor1 = Profesor(nombre = "Tutor 1", asignaturas = listOf("Matemáticas"), asignaturasPreferidas = emptyList(), minutosMaximos = 1350)
        val g1 = Grupo(curso = "1º", nombre = "A", tutor = tutor1)

        val lessons = mutableListOf<Leccion>()
        repeat(4) { lessons.add(Leccion(id = UUID.randomUUID().toString(), asignatura = "Física Avanzada", grupo = g1, minutosSemanales = 120, profesorFijo = null)) }

        val config = Configuracion(priorizarTutor = true, tiempoMinimo = 30, tiempoMaximo = 60, respetarEspecialidad = true, respetarLimiteHoras = true)
        val result = OrToolsScheduleSolver.solve(slots, lessons, listOf(tutor1), config, timeLimitSeconds = 2.0)

        assertTrue(result.conflictos.isNotEmpty() || result.hardScore < 0, "El escenario sin especialidad cubierta debe reportar conflictos.")
    }
}
