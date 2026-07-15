package com.colegio.solver

// IMPORTS VITALES
import ai.timefold.solver.core.api.solver.SolverFactory
import com.colegio.modelos.ProfesoresTable
import org.jetbrains.exposed.sql.selectAll
import org.jetbrains.exposed.sql.transactions.transaction
import org.slf4j.LoggerFactory
import java.time.DayOfWeek
import java.time.LocalTime

private val logger = LoggerFactory.getLogger("SimuladorHorarios")
fun Simulacion() {

    logger.info("1. Extrayendo datos de SQLite...")
    val leccionesSinAsignar = mutableListOf<Leccion>()

    transaction {
        val profesoresBd = ProfesoresTable.selectAll()

        for (fila in profesoresBd) {
            leccionesSinAsignar.add(
                Leccion(
                    id = fila[ProfesoresTable.id].value.toString(),
                    asignatura = "Matemáticas",
                    profesor = fila[ProfesoresTable.nombre],
                    grupo = "1ºA",
                    duracionMinutos = 60 // <-- Añadido el parámetro que faltaba
                )
            )
        }
    }

    logger.info("2. Preparando el motor matemático...")

    // Usamos los tipos reales de Java Time en lugar de Strings
    val franjasDisponibles = listOf(
        TimeSlot(
            id = "T1",
            dayOfWeek = DayOfWeek.MONDAY,
            startTime = LocalTime.of(9, 0), // 09:00
            endTime = LocalTime.of(10, 0)   // 10:00
        ),
        TimeSlot(
            id = "T2",
            dayOfWeek = DayOfWeek.MONDAY,
            startTime = LocalTime.of(10, 0), // 10:00
            endTime = LocalTime.of(11, 0)    // 11:00
        )
    )

    val problemaInicial = HorarioSolution(
        timeSlotList = franjasDisponibles,
        lessonList = leccionesSinAsignar
    )

    logger.info("3. Calculando el mejor horario...")

    val solverFactory = SolverFactory.createFromXmlResource<HorarioSolution>("solverConfig.xml")
    val solver = solverFactory.buildSolver()

    val solucionFinal = solver.solve(problemaInicial)

    logger.info("4. Guardando el resultado en SQLite...")

    transaction {
        for (leccionResuelta in solucionFinal.lessonList) {
            val huecoAsignado = leccionResuelta.timeSlot

            // Actualizado para usar las propiedades correctas de tu TimeSlot (dayOfWeek y startTime)
            logger.info(" -> A ${leccionResuelta.profesor} se le ha asignado el hueco: ${huecoAsignado?.dayOfWeek} a las ${huecoAsignado?.startTime}")
        }
    }

    logger.info("¡Proceso terminado con éxito!")
}