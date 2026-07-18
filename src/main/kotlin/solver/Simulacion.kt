package com.colegio.solver

import ai.timefold.solver.core.api.solver.SolutionManager
import ai.timefold.solver.core.api.score.buildin.hardsoft.HardSoftScore
import ai.timefold.solver.core.api.solver.SolverFactory
import com.colegio.DTO.Configuracion
import com.colegio.modelos.entities.AsignaturaEntity
import com.colegio.modelos.entities.GruposEntity
import com.colegio.modelos.entities.ProfesorEntity
import com.colegio.modelos.tables.CursoTable
import com.colegio.modelos.tables.GruposTable
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
        // LA MAGIA DEL DAO: Hacemos 1 sola consulta masiva para traer a los profesores
        // y dejamos sus asignaturas "pre-cargadas" en memoria usando .with()
        val todasLasAsignaturas = AsignaturaEntity.all()

        var idLeccion = 1

        // 2. Iteramos sobre los objetos Asignatura que tiene asignados
        for (asignatura in todasLasAsignaturas) {
            val asigNombre = asignatura.nombre
            val asigMinutos = asignatura.minutos
            val query = (GruposTable innerJoin CursoTable)
                .selectAll()
                .where { CursoTable.nombre eq asignatura.curso.nombre }

            // Convertimos el resultado de la consulta SQL pura a objetos Entidad
            val grupos = GruposEntity.wrapRows(query).toList()

            // LA MAGIA MATEMÁTICA: Dividimos los minutos totales entre 30 (tiempoMinimo)
            val cantidadDeFichas = asigMinutos / configuracion.tiempoMinimo

            for (i in 1..cantidadDeFichas) {
                for (grupo in grupos) {
                    leccionesSinAsignar.add(
                        Leccion(
                            id = "Lec_${idLeccion++}",
                            asignatura = asigNombre,
                            grupo = grupo.toGrupo()
                        )
                    )
                }
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

    var profesorList = emptyList<Profesor>()
    transaction {
        profesorList = ProfesorEntity.all().map { profesor -> profesor.toProfesor() }
    }

    // --- NUEVO: AUDITORÍA DE PROFESORES DISPONIBLES ---
    val asignaturasCubiertas = profesorList.flatMap { it.asignaturas }.toSet()

    transaction {
        val todasLasAsignaturas = AsignaturaEntity.all().toList()
        for (asig in todasLasAsignaturas) {
            if (!asignaturasCubiertas.contains(asig.nombre)) {
                logger.error("⚠️ ¡ALERTA CRÍTICA! La asignatura '${asig.nombre}' de ${asig.curso.nombre} no tiene NINGÚN profesor capacitado en la base de datos.")
            }
        }
    }
    // --------------------------------------------------

    val problemaInicial = HorarioSolution(
        timeSlotList = franjasDisponibles,
        lessonList = leccionesSinAsignar,
        configuracion = configuracion,
        profesorList = profesorList
    )

    logger.info("3. Arrancando el motor matemático Timefold...")
    val solverFactory = SolverFactory.createFromXmlResource<HorarioSolution>("solverConfig.xml")
    val solver = solverFactory.buildSolver()

    // El hilo se congela aquí durante los segundos que le hayas marcado en solverConfig.xml
    val solucionFinal = solver.solve(problemaInicial)

    // --- NUEVO: AUDITORÍA DE REGLAS ROTAS ---
    val solutionManager = SolutionManager.create(solverFactory)
    val explicacion = solutionManager.explain(solucionFinal)

    if (!solucionFinal.score!!.isFeasible) {
        logger.error("❌ ¡ALERTA! El horario es INVÁLIDO porque rompe reglas DURAS. Desglose del fallo:")

        explicacion.constraintMatchTotalMap.values.forEach { match ->
            val scoreDeLaRegla = match.score as HardSoftScore

            if (scoreDeLaRegla.hardScore() < 0) {
                logger.error(" -> REGLA INCUMPLIDA: '${match.constraintName}'")
                logger.error("    Impacto: ${scoreDeLaRegla.hardScore()} puntos Hard.")
                logger.error("    Veces que se rompió: ${match.constraintMatchCount} veces.")
            }
        }
    } else {
        logger.info("✅ El horario es matemáticamente factible (0 reglas duras rotas).")
    }
    // ----------------------------------------

    logger.info("4. ¡Horario Resuelto! Imprimiendo resultados ordenados:")

    // Ordenamos la lista final por Día y por Hora para que la lectura en consola sea humana
    val leccionesOrdenadas = solucionFinal.lessonList.sortedWith(
        compareBy<Leccion> { it.timeSlot?.dayOfWeek }
            .thenBy { it.timeSlot?.startTime }
            .thenBy { it.grupo.nombre }
            .thenBy { it.grupo.curso }
    )

    var diaActual: DayOfWeek? = null

    for (leccion in leccionesOrdenadas) {
        val hueco = leccion.timeSlot
        val profe = leccion.profesor

        if (hueco == null) {
            logger.error("❌ ALERTA: La lección ${leccion.id} de ${leccion.asignatura} se quedó SIN HORA.")
        } else if (profe == null) {
            logger.error("❌ ALERTA: La lección ${leccion.id} de ${leccion.asignatura} en ${leccion.grupo.curso}${leccion.grupo.nombre} se quedó SIN PROFESOR asignado.")
        } else {
            // Imprimimos un separador cada vez que cambiamos de día
            if (diaActual != hueco.dayOfWeek) {
                logger.info("--- ${hueco.dayOfWeek} ---")
                diaActual = hueco.dayOfWeek
            }

            logger.info("[${hueco.startTime} - ${hueco.endTime}] ${leccion.grupo.curso}${leccion.grupo.nombre} | ${leccion.asignatura} (Prof. ${profe.nombre})")
        }
    }
}