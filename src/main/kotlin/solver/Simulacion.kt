package com.colegio.solver

import ai.timefold.solver.core.api.score.buildin.hardsoft.HardSoftScore
import ai.timefold.solver.core.api.solver.SolutionManager
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

// Función auxiliar para tener los días en español en cualquier parte del archivo
fun traducirDia(dia: DayOfWeek): String {
    return when (dia) {
        DayOfWeek.MONDAY -> "LUNES"
        DayOfWeek.TUESDAY -> "MARTES"
        DayOfWeek.WEDNESDAY -> "MIÉRCOLES"
        DayOfWeek.THURSDAY -> "JUEVES"
        DayOfWeek.FRIDAY -> "VIERNES"
        else -> dia.name
    }
}

fun Simulacion() {
    val configuracion = Configuracion(priorizarTutor = true, tiempoMinimo = 30, tiempoMaximo = 60)
    logger.info("1. Fabricando fichas (bloques de ${configuracion.tiempoMinimo} min)...")
    val leccionesSinAsignar = mutableListOf<Leccion>()

    transaction {
        val todasLasAsignaturas = AsignaturaEntity.all()
        var idLeccion = 1

        for (asignatura in todasLasAsignaturas) {
            val query = (GruposTable innerJoin CursoTable).selectAll().where { CursoTable.nombre eq asignatura.curso.nombre }
            val grupos = GruposEntity.wrapRows(query).toList()


            val asigMinutos = asignatura.minutos // <--- Asegúrate de tener esta variable
            val cantidadDeFichas = asigMinutos / configuracion.tiempoMinimo

            for (i in 1..cantidadDeFichas) {
                for (grupo in grupos) {
                    leccionesSinAsignar.add(
                        Leccion(
                            id = "Lec_${idLeccion++}",
                            asignatura = asignatura.nombre,
                            grupo = grupo.toGrupo(),
                            minutosSemanales = asigMinutos // <--- AÑADIMOS EL DATO AQUÍ
                        )
                    )
                }
            }
        }
    }

    logger.info("2. Generando el tablero de tiempo (09:00 a 14:00 saltando el recreo)...")
    val franjasDisponibles = mutableListOf<TimeSlot>()
    var idFranja = 1
    var indiceGlobal = 0

    for (i in 1..5) {
        val dia = DayOfWeek.of(i)
        var horaActual = LocalTime.of(9, 0)
        val horaFinDia = LocalTime.of(14, 0)
        val horaRecreo = LocalTime.of(12, 0)

        while (horaActual.isBefore(horaFinDia)) {
            val horaSiguiente = horaActual.plusMinutes(configuracion.tiempoMinimo.toLong())

            if (horaActual != horaRecreo) {
                franjasDisponibles.add(
                    TimeSlot(
                        id = "T_${idFranja++}", dayOfWeek = dia,
                        startTime = horaActual, endTime = horaSiguiente,
                        indiceDeFranja = indiceGlobal++, duracionMinutos = configuracion.tiempoMinimo
                    )
                )
            }
            horaActual = horaSiguiente
        }
    }

    var profesorList = emptyList<Profesor>()
    transaction { profesorList = ProfesorEntity.all().map { it.toProfesor() } }

    val problemaInicial = HorarioSolution(
        timeSlotList = franjasDisponibles, lessonList = leccionesSinAsignar,
        configuracion = configuracion, profesorList = profesorList
    )

    logger.info("3. Arrancando el motor matemático Timefold...")
    val solverFactory = SolverFactory.createFromXmlResource<HorarioSolution>("solverConfig.xml")
    val solver = solverFactory.buildSolver()
    val solucionFinal = solver.solve(problemaInicial)

    val solutionManager = SolutionManager.create(solverFactory)
    val explicacion = solutionManager.explain(solucionFinal)

    // --- NUEVO: AUDITORÍA ULTRA PRECISA DE REGLAS ROTAS ---
    if (!solucionFinal.score!!.isFeasible) {
        logger.error("❌ ¡ALERTA! El horario rompe reglas DURAS. Detalles del conflicto:")

        explicacion.constraintMatchTotalMap.values
            .filter { (it.score as HardSoftScore).hardScore() < 0 }
            .forEach { match ->
                val scoreDeLaRegla = match.score as HardSoftScore
                logger.error(" -> REGLA: '${match.constraintName}' | Penalización: ${scoreDeLaRegla.hardScore()} Hard")

                // Entramos a ver cada emparejamiento incorrecto individualmente
                match.constraintMatchSet.forEach { constraintMatch ->
                    val culpables = constraintMatch.indictedObjectList

                    // Traducimos los objetos nativos de la IA a texto legible para humanos
                    val detallesCulpables = culpables.map { obj ->
                        when (obj) {
                            is Leccion -> "'${obj.asignatura}' de ${obj.grupo.curso}${obj.grupo.nombre}"
                            is Profesor -> "Prof. ${obj.nombre}"
                            else -> obj.toString()
                        }
                    }.joinToString(" con ")

                    // Intentamos averiguar el momento exacto del tiempo usando la primera lección que encontremos
                    val unaLeccion = culpables.filterIsInstance<Leccion>().firstOrNull()
                    val momentoTexto = unaLeccion?.timeSlot?.let {
                        " el ${traducirDia(it.dayOfWeek)} de ${it.startTime} a ${it.endTime}"
                    } ?: ""

                    logger.error("    • Fallo detectado$momentoTexto afectando a: $detallesCulpables")
                }
            }
    } else {
        logger.info("✅ Horario matemáticamente factible (0 reglas duras rotas).")
    }
    // -----------------------------------------------------

    logger.info("4. Imprimiendo resultados ordenados:")
    val leccionesOrdenadas = solucionFinal.lessonList.sortedWith(
        compareBy<Leccion> { it.timeSlot?.dayOfWeek }.thenBy { it.timeSlot?.startTime }.thenBy { it.grupo.curso }.thenBy { it.grupo.nombre }
    )

    var diaActual: DayOfWeek? = null
    for (leccion in leccionesOrdenadas) {
        val hueco = leccion.timeSlot
        val profe = leccion.profesor

        if (hueco != null && profe != null) {
            if (diaActual != hueco.dayOfWeek) {
                logger.info("--- ${traducirDia(hueco.dayOfWeek)} ---")
                diaActual = hueco.dayOfWeek
            }
            logger.info("[${hueco.startTime} - ${hueco.endTime}] ${leccion.grupo.curso} ${leccion.grupo.nombre} | ${leccion.asignatura} (Prof. ${profe.nombre})")
        }
    }
}