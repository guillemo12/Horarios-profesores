package com.colegio.solver

import ai.timefold.solver.core.api.score.buildin.hardsoft.HardSoftScore
import ai.timefold.solver.core.api.solver.SolutionManager
import ai.timefold.solver.core.api.solver.SolverFactory
import com.colegio.Constantes.solucion
import com.colegio.DTO.Configuracion
import com.colegio.modelos.entities.AsignaturaEntity
import com.colegio.modelos.entities.GruposEntity
import com.colegio.modelos.entities.ProfesorEntity
import com.colegio.modelos.tables.CursoTable
import com.colegio.modelos.tables.GruposTable
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
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
            val query =
                (GruposTable innerJoin CursoTable).selectAll().where { CursoTable.nombre eq asignatura.curso.nombre }
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
    solucion = solverFactory.buildSolver()
    // --- NUEVO: Listener para ver progreso en tiempo real ---
// 1. Creamos el analizador de soluciones ANTES del evento (para no saturar la memoria)
    val solutionManager = SolutionManager.create(solverFactory)
// Creamos un scope para lanzar tareas asíncronas en hilos secundarios
    val bgScope = CoroutineScope(Dispatchers.Default)

    solucion!!.addEventListener { event ->
        val bestScore = event.newBestScore as HardSoftScore

        // Imprimir el score es rapidísimo, lo dejamos en el hilo principal
        logger.info("📊 Progreso -> Mejor score actual encontrado: $bestScore")

        if (bestScore.hardScore() < 0) {
            // Guardamos la referencia del clon para pasarla al hilo secundario
            val snapshot = event.newBestSolution

            // Lanzamos la tarea pesada de forma ASÍNCRONA
            bgScope.launch {
                // A partir de esta línea, el solver original ya está calculando
                // el siguiente paso. Esto corre en paralelo en otro núcleo.

                val explanation = solutionManager.explain(snapshot)
                logger.info("   ⚠️ DETALLE EXACTO DE REGLAS HARD ROTAS:")

                explanation.constraintMatchTotalMap.values.forEach { matchTotal ->
                    val scoreDeLaRegla = matchTotal.score as HardSoftScore

                    if (scoreDeLaRegla.hardScore() < 0) {
                        logger.info("      ❌ Regla: '${matchTotal.constraintName}'")

                        matchTotal.constraintMatchSet.forEach { match ->
                            // Usamos indictedObjectList como vimos antes
                            logger.info("         -> Culpables: ${match.indictedObjectList}")
                        }
                    }
                }
                logger.info("   ------------------------------------------------")
            }
        }

    }



    val solucionFinal = solucion!!.solve(problemaInicial)

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
                    val detallesCulpables = culpables.joinToString(" con ") { obj ->
                        when (obj) {
                            is Leccion -> "'${obj.asignatura}' de ${obj.grupo.curso}${obj.grupo.nombre}"
                            is Profesor -> "Prof. ${obj.nombre}"
                            else -> obj.toString()
                        }
                    }

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

    logger.info("4. Generando vistas por grupo y exportando a CSV...")

    // Agrupamos las lecciones por el nombre del curso y la letra (Ej: "1º A")
    val leccionesPorGrupo = solucionFinal.lessonList
        .filter { it.timeSlot != null && it.profesor != null }
        .groupBy { "${it.grupo.curso} ${it.grupo.nombre}" }
        .toSortedMap() // Las ordenamos alfabéticamente

    // --- 1. IMPRIMIR POR CONSOLA SEPARADO POR GRUPOS ---
    for ((nombreGrupo, leccionesDelGrupo) in leccionesPorGrupo) {
        logger.info("=========================================")
        logger.info(" HORARIO: $nombreGrupo")
        logger.info("=========================================")

        val leccionesOrdenadas = leccionesDelGrupo.sortedWith(
            compareBy<Leccion> { it.timeSlot?.dayOfWeek }.thenBy { it.timeSlot?.startTime }
        )

        var diaActual: DayOfWeek? = null
        for (leccion in leccionesOrdenadas) {
            val hueco = leccion.timeSlot!!
            if (diaActual != hueco.dayOfWeek) {
                logger.info("--- ${traducirDia(hueco.dayOfWeek)} ---")
                diaActual = hueco.dayOfWeek
            }
            logger.info("  [${hueco.startTime} - ${hueco.endTime}] ${leccion.asignatura} (Prof. ${leccion.profesor!!.nombre})")
        }
        logger.info("") // Espacio en blanco para separar grupos
    }

    // --- 2. GENERAR ARCHIVO EXCEL (.xlsx) ---
    try {
        val workbook = org.apache.poi.xssf.usermodel.XSSFWorkbook()
        val hoja = workbook.createSheet("Horarios Escolares")

        // Estilo cabecera
        val estiloCabecera = workbook.createCellStyle()
        val fuente = workbook.createFont()
        fuente.bold = true
        estiloCabecera.setFont(fuente)

        val cabeceras = listOf("Grupo", "Día", "Hora Inicio", "Hora Fin", "Asignatura", "Profesor")
        val filaCabecera = hoja.createRow(0)

        cabeceras.forEachIndexed { i, texto ->
            val celda = filaCabecera.createCell(i)
            celda.setCellValue(texto)
            celda.cellStyle = estiloCabecera
        }

        var numFila = 1
        for ((nombreGrupo, leccionesDelGrupo) in leccionesPorGrupo) {
            val leccionesOrdenadas = leccionesDelGrupo.sortedWith(
                compareBy<Leccion> { it.timeSlot?.dayOfWeek }.thenBy { it.timeSlot?.startTime }
            )
            for (leccion in leccionesOrdenadas) {
                val fila = hoja.createRow(numFila++)
                fila.createCell(0).setCellValue(nombreGrupo)
                fila.createCell(1).setCellValue(traducirDia(leccion.timeSlot!!.dayOfWeek))
                fila.createCell(2).setCellValue(leccion.timeSlot!!.startTime.toString())
                fila.createCell(3).setCellValue(leccion.timeSlot!!.endTime.toString())
                fila.createCell(4).setCellValue(leccion.asignatura)
                fila.createCell(5).setCellValue(leccion.profesor!!.nombre)
            }
        }

        // Autoajustar columnas
        for (i in 0 until cabeceras.size) hoja.autoSizeColumn(i)

        val archivoExcel = java.io.File("Horarios_Colegio.xlsx")
        workbook.use { it.write(archivoExcel.outputStream()) }

        logger.info("✅ Excel (.xlsx) generado correctamente en: ${archivoExcel.absolutePath}")
    } catch (e: Exception) {
        logger.error("❌ Error al crear el archivo Excel: ${e.message}")
    }
}
