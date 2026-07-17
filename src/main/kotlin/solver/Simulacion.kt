package com.colegio.solver

import ai.timefold.solver.core.api.solver.SolverFactory
import com.colegio.DTO.Configuracion
import com.colegio.modelos.AsignaturaTable
import com.colegio.modelos.ProfesorAsignaturaTable
import com.colegio.modelos.ProfesorTable
import org.jetbrains.exposed.sql.selectAll
import org.jetbrains.exposed.sql.transactions.transaction
import org.slf4j.LoggerFactory
import java.time.DayOfWeek
import java.time.LocalTime

private val logger = LoggerFactory.getLogger("SimuladorHorarios")

fun Simulacion() {
    // Definimos nuestra franja base
    val configuracion = Configuracion(priorizarTutor = true, tiempoMinimo = 30, tiempoMaximo = 60)

    logger.info("1. Extrayendo datos de SQLite y fabricando fichas (bloques de ${configuracion.tiempoMinimo} min)...")
    val leccionesSinAsignar = mutableListOf<Leccion>()

    transaction {
        // Hacemos un INNER JOIN triple para unir Profesores -> Relación -> Asignaturas
        val query = (ProfesorTable innerJoin ProfesorAsignaturaTable innerJoin AsignaturaTable)
            .selectAll()

        var idLeccion = 1

        for (fila in query) {
            val profeNombre = fila[ProfesorTable.nombre]
            val asigNombre = fila[AsignaturaTable.nombre]
            val asigCurso = fila[AsignaturaTable.curso]
            val asigMinutos = fila[AsignaturaTable.minutos]

            // LA MAGIA: Dividimos los minutos totales entre 30 para saber cuántas fichas crear
            val cantidadDeFichas = asigMinutos / configuracion.tiempoMinimo

            for (i in 1..cantidadDeFichas) {
                leccionesSinAsignar.add(
                    Leccion(
                        id = "Lec_${idLeccion++}",
                        asignatura = asigNombre,
                        profesor = profeNombre,
                        grupo = asigCurso
                    )
                )
            }
        }
    }

    logger.info(" -> ¡Se han generado ${leccionesSinAsignar.size} fichas en total para el motor!")

    logger.info("2. Generando el tablero de tiempo (Lunes a Viernes)...")
    val franjasDisponibles = mutableListOf<TimeSlot>()
    var idFranja = 1
    var indiceGlobal = 0

    // Bucle para crear franjas de 09:00 a 12:00 todos los días de la semana
    for (i in 1..5) {
        val dia = DayOfWeek.of(i) // Traduce el número al día de Java Time

        var horaActual = LocalTime.of(9, 0)
        val horaFinDia = LocalTime.of(12, 0)

        while (horaActual.isBefore(horaFinDia)) {
            val horaSiguiente = horaActual.plusMinutes(configuracion.tiempoMinimo.toLong())

            franjasDisponibles.add(
                TimeSlot(
                    id = "T_${idFranja++}",
                    dayOfWeek = dia,
                    startTime = horaActual,
                    endTime = horaSiguiente,
                    indiceDeFranja = indiceGlobal++, // Vital para buscar clases consecutivas
                    duracionMinutos = configuracion.tiempoMinimo
                )
            )
            horaActual = horaSiguiente
        }
    }

    val problemaInicial = HorarioSolution(
        timeSlotList = franjasDisponibles,
        lessonList = leccionesSinAsignar,
        configuracion = configuracion
    )

    logger.info("3. Arrancando el motor matemático Timefold...")
    val solverFactory = SolverFactory.createFromXmlResource<HorarioSolution>("solverConfig.xml")
    val solver = solverFactory.buildSolver()

    // El hilo se congela aquí durante los segundos que le hayas marcado en solverConfig.xml
    val solucionFinal = solver.solve(problemaInicial)

    logger.info("4. ¡Horario Resuelto! Imprimiendo resultados ordenados:")

    // Ordenamos la lista final por Día y por Hora para que la lectura en consola sea humana
    val leccionesOrdenadas = solucionFinal.lessonList.sortedWith(
        compareBy<Leccion> { it.timeSlot?.dayOfWeek }
            .thenBy { it.timeSlot?.startTime }
    )

    var diaActual: DayOfWeek? = null

    for (leccion in leccionesOrdenadas) {
        val hueco = leccion.timeSlot
        if (hueco != null) {
            // Imprimimos un separador cada vez que cambiamos de día
            if (diaActual != hueco.dayOfWeek) {
                logger.info("--- ${hueco.dayOfWeek} ---")
                diaActual = hueco.dayOfWeek
            }

            logger.info("[${hueco.startTime} - ${hueco.endTime}] ${leccion.grupo} | ${leccion.asignatura} (Prof. ${leccion.profesor})")
        } else {
            logger.error("¡ALERTA! La lección ${leccion.id} de ${leccion.asignatura} se quedó sin asignar.")
        }
    }
}