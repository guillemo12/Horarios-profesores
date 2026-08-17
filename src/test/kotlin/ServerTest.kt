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
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class ServerTest {

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

        println("\n=======================================================")
        println("=== PRUEBA 1: ESCENARIO NORMAL (VÁLIDO) ===")
        println("=======================================================")
        println("Status: ${result.status}")
        println("IsFeasible: ${result.isFeasible}")
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

        println("\n=======================================================")
        println("=== PRUEBA 2: ESCENARIO DE FALLO POR SOBRECARGA ===")
        println("=======================================================")
        println("Status: ${result.status}")
        println("IsFeasible: ${result.isFeasible}")
        println("Conflictos detectados (${result.conflictos.size}):")
        result.conflictos.forEach { println("   • $it") }

        assertTrue(result.conflictos.isNotEmpty() || result.hardScore < 0, "El escenario con sobrecarga debe reportar conflictos o déficit.")
        assertTrue(result.conflictos.any { it.contains("Clases Sin Colocar") || it.contains("jornada completa") || it.contains("Exceso") || it.contains("Sobrecarga") }, "Debe reportar conflicto de sobrecarga / clases sin colocar.")
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

        println("\n=======================================================")
        println("=== PRUEBA 3: ESCENARIO DE FALLO POR FALTA DE ESPECIALIDAD ===")
        println("=======================================================")
        println("Status: ${result.status}")
        println("IsFeasible: ${result.isFeasible}")
        println("Conflictos detectados (${result.conflictos.size}):")
        result.conflictos.forEach { println("   • $it") }

        assertTrue(result.conflictos.isNotEmpty() || result.hardScore < 0, "El escenario sin especialidad cubierta debe reportar conflictos.")
        assertTrue(result.conflictos.any { it.contains("Sin profesores") || it.contains("Especialidad No Cubierta") || it.contains("Clases Sin Colocar") }, "Debe reportar falta de especialidad.")
    }

    @Test
    fun `test 4 - full 24 groups solver execution on colegio db`() {
        val dbFile = File("colegio.db")
        if (!dbFile.exists()) return

        Database.connect("jdbc:sqlite:colegio.db", "org.sqlite.JDBC")

        val config = Configuracion(priorizarTutor = true, tiempoMinimo = 30, tiempoMaximo = 60, respetarEspecialidad = true, respetarLimiteHoras = true)
        val slots = createStandardSlots()

        transaction {
            val profesorList = ProfesorEntity.all().map { it.toProfesor() }
            val grupoList = GruposEntity.all().toList()
            val lecciones = mutableListOf<Leccion>()

            for (grupoEnt in grupoList) {
                val asigList = AsignaturaEntity.find { AsignaturaTable.curso eq grupoEnt.curso.id }.toList()
                val repartoMap = RepartoDocenteTable.selectAll()
                    .where { RepartoDocenteTable.grupoId eq grupoEnt.id }
                    .associate { it[RepartoDocenteTable.asignaturaId].value to it[RepartoDocenteTable.profesorId].value }

                for (asigEnt in asigList) {
                    val minutes = asigEnt.minutos
                    val blocksCount = minutes / 30
                    val profFijoId = repartoMap[asigEnt.id.value]
                    val profEnt = profFijoId?.let { ProfesorEntity.findById(it) }

                    for (b in 1..blocksCount) {
                        lecciones.add(
                            Leccion(
                                id = UUID.randomUUID().toString(),
                                asignatura = asigEnt.nombre,
                                grupo = grupoEnt.toGrupo(),
                                minutosSemanales = minutes,
                                profesorFijo = profEnt?.toProfesor()
                            )
                        )
                    }
                }
            }

            println("\n=======================================================")
            println("=== PRUEBA 4: RESOLUCIÓN COMPLETA DE 24 GRUPOS EN COLEGIO.DB ===")
            println("=======================================================")
            println("Total lecciones: ${lecciones.size}, Profesores: ${profesorList.size}")

            val result = OrToolsScheduleSolver.solve(slots, lecciones, profesorList, config, timeLimitSeconds = 60.0)

            println("Status: ${result.status}")
            println("IsFeasible: ${result.isFeasible}")
            println("Conflictos (${result.conflictos.size}):")
            result.conflictos.forEach { println("   • $it") }

            assertTrue(result.isFeasible, "La base de datos real colegio.db debe ser FEASIBLE.")
        }
    }
}
