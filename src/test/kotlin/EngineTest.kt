package com.colegio

import ai.timefold.solver.core.api.solver.SolverFactory
import com.colegio.solver.*
import java.time.DayOfWeek
import java.time.LocalTime
import kotlin.test.*

class EngineTest {

    @Test
    fun testReglasDelMotor() {
        // Configuramos la factoria de Timefold usando el XML
        val solverFactory = SolverFactory.createFromXmlResource<HorarioSolution>("solverConfig.xml")
        val solver = solverFactory.buildSolver()

        val profes = listOf(
            Profesor("Profe A", listOf("Matemáticas"), listOf(), 60), // Máximo 60 minutos
            Profesor("Profe B", listOf("Lengua"), listOf(), 1000)
        )
        val grupos = listOf(
            Grupo("1º", "A", profes[0])
        )
        val franjas = listOf(
            TimeSlot("1", DayOfWeek.MONDAY, LocalTime.of(9, 0), LocalTime.of(10, 0), 60, 0),
            TimeSlot("2", DayOfWeek.MONDAY, LocalTime.of(10, 0), LocalTime.of(11, 0), 60, 1)
        )

        val config = com.colegio.DTO.Configuracion(true, 30, 60, 1500, 100, 10, 50, 5)

        // El profe A solo puede dar 60 minutos, pero le asignamos 2 clases de 60
        val leccion1 = Leccion("1", "Matemáticas", grupos[0], 120).apply {
            profesor = profes[0]
            timeSlot = franjas[0]
        }
        val leccion2 = Leccion("2", "Matemáticas", grupos[0], 120).apply {
            profesor = profes[0]
            timeSlot = franjas[1]
        }
        val lecciones = listOf(leccion1, leccion2)

        val problemaInicial = HorarioSolution(
            timeSlotList = franjas,
            lessonList = lecciones,
            configuracion = config,
            profesorList = profes
        )

        // Ejecutamos el solver (como es rápido por el timeout bajísimo, resolverá)
        // La propia ejecución del solver evalúa el score y reasigna
        // Forzamos un test de si el motor respeta la restricción (le va a dar hard score negativo
        // a cualquier solución que ponga dos profes a la vez o exceda horas).
        val scoreManager = ai.timefold.solver.core.api.score.ScoreManager.create(solverFactory)
        val score = scoreManager.updateScore(problemaInicial) as ai.timefold.solver.core.api.score.buildin.hardsoft.HardSoftScore

        // Esperamos que haya score negativo (Hard) por romper la regla del limite de horas de Profe A o superposición
        assertTrue(score.hardScore() < 0, "Debería haber un HardScore negativo al romper reglas fuertes.")
    }
}
