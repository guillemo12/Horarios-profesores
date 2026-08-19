package com.colegio.solver

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

fun traducirDia(dia: DayOfWeek): String = SolverConstraintUtils.traducirDia(dia)

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

            val asigMinutos = asignatura.minutos
            val cantidadDeFichas = SolverLessonDataLoader.calculateBlocksCount(asigMinutos, configuracion.tiempoMinimo)

            for (i in 1..cantidadDeFichas) {
                for (grupo in grupos) {
                    leccionesSinAsignar.add(
                        Leccion(
                            id = "Lec_${idLeccion++}",
                            asignatura = asignatura.nombre,
                            grupo = grupo.toGrupo(),
                            minutosSemanales = asigMinutos
                        )
                    )
                }
            }
        }
    }

    logger.info("2. Generando el tablero de tiempo (09:00 a 14:00 saltando el recreo)...")
    val franjasDisponibles = SolverLessonDataLoader.generateTimeSlots(configuracion)

    var profesorList = emptyList<Profesor>()
    transaction { profesorList = ProfesorEntity.all().map { it.toProfesor() } }

    logger.info("3. Arrancando el motor matemático Google OR-Tools (CP-SAT Solver)...")
    val resultado = OrToolsScheduleSolver.solve(
        timeSlots = franjasDisponibles,
        lessons = leccionesSinAsignar,
        teachers = profesorList,
        config = configuracion,
        timeLimitSeconds = 10.0,
        onProgress = { progress ->
            logger.info("📊 Progreso OR-Tools -> Score Soft actual: ${progress.softScore}")
        }
    )

    if (!resultado.isFeasible) {
        logger.error("❌ ¡ALERTA! El horario NO ES VIABLE. Detalles de conflictos detectados:")
        resultado.conflictos.forEach { conflicto ->
            logger.error(" -> ❌ $conflicto")
        }
    } else {
        logger.info("✅ Horario matemáticamente VIABLE y FACTIBLE (0 reglas duras rotas). Score Soft: ${resultado.softScore}")
    }

    logger.info("4. Generando vistas por grupo y exportando a Excel (.xlsx)...")

    val leccionesPorGrupo = resultado.solvedLessons
        .filter { it.timeSlot != null && it.profesor != null }
        .groupBy { "${it.grupo.curso} ${it.grupo.nombre}" }
        .toSortedMap()

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
        logger.info("")
    }

    try {
        val workbook = org.apache.poi.xssf.usermodel.XSSFWorkbook()
        val hoja = workbook.createSheet("Horarios Escolares")

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

        for (i in 0 until cabeceras.size) hoja.autoSizeColumn(i)

        val archivoExcel = java.io.File("Horarios_Colegio.xlsx")
        workbook.use { it.write(archivoExcel.outputStream()) }

        logger.info("✅ Excel (.xlsx) generado correctamente en: ${archivoExcel.absolutePath}")
    } catch (e: Exception) {
        logger.error("❌ Error al crear el archivo Excel: ${e.message}")
    }
}
