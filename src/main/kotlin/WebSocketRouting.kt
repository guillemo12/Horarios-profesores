package com.colegio

import ai.timefold.solver.core.api.score.buildin.hardsoft.HardSoftScore
import ai.timefold.solver.core.api.solver.Solver
import ai.timefold.solver.core.api.solver.SolverFactory
import com.colegio.DTO.Configuracion
import com.colegio.DTO.ScheduledClassDto
import com.colegio.DTO.WsMessage
import com.colegio.modelos.entities.*
import com.colegio.modelos.tables.*
import com.colegio.solver.HorarioSolution
import com.colegio.solver.Leccion
import com.colegio.solver.TimeSlot
import io.ktor.server.application.*
import io.ktor.server.routing.*
import io.ktor.server.websocket.*
import io.ktor.websocket.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.serialization.json.Json
import org.jetbrains.exposed.dao.id.EntityID
import org.jetbrains.exposed.sql.SqlExpressionBuilder.eq
import org.jetbrains.exposed.sql.and
import org.jetbrains.exposed.sql.deleteWhere
import org.jetbrains.exposed.sql.insert
import org.jetbrains.exposed.sql.selectAll
import org.jetbrains.exposed.sql.transactions.transaction
import org.slf4j.LoggerFactory
import java.time.DayOfWeek
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.LocalTime
import java.time.format.DateTimeFormatter
import java.time.temporal.TemporalAdjusters
import java.util.*
import java.util.concurrent.ConcurrentHashMap


fun Application.configureSockets() {
    val logger = LoggerFactory.getLogger("WebSocket")
    val activeSolvers = ConcurrentHashMap<DefaultWebSocketServerSession, Solver<HorarioSolution>>()

    install(WebSockets) {
        maxFrameSize = Long.MAX_VALUE
        masking = false
    }

    // Helper functions for dates
    val today = LocalDate.now()
    val monday = today.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY))

    fun getIsoDateTime(day: DayOfWeek, time: LocalTime): String {
        val date = monday.plusDays((day.value - 1).toLong())
        val dateTime = LocalDateTime.of(date, time)
        // Ensure formatting includes 'Z' to be parsed correctly by frontend as UTC time
        // to prevent timezone shifts when loading pins
        return dateTime.format(DateTimeFormatter.ISO_LOCAL_DATE_TIME) + "Z"
    }

    fun findTimeSlot(isoStr: String, timeSlots: List<TimeSlot>): TimeSlot? {
        return try {
            // Check if it's already an Instant format with Z
            val isUtc = isoStr.endsWith("Z") || isoStr.contains("+00:00")
            if (isUtc) {
                val instant = java.time.Instant.parse(isoStr)
                // Assuming backend expects time in UTC context if timezone not correctly configured
                // Or simply extract local time and day from the UTC ZonedDateTime
                val zdt = instant.atZone(java.time.ZoneId.of("UTC"))
                val day = zdt.dayOfWeek
                val time = zdt.toLocalTime()
                return timeSlots.find { it.dayOfWeek == day && it.startTime == time }
            }

            val cleanStr = isoStr.replace(" ", "T").let { s ->
                if (s.contains("T")) {
                    val parts = s.split("T")
                    val datePart = parts[0]
                    val timePart = parts[1].split(".", "+", "Z")[0]
                    "${datePart}T${timePart}"
                } else s
            }
            val dt = LocalDateTime.parse(cleanStr)
            val day = dt.dayOfWeek
            val time = dt.toLocalTime()
            timeSlots.find { it.dayOfWeek == day && it.startTime == time }
        } catch (e: Exception) {
            logger.warn("Error parsing ISO date: $isoStr -> ${e.message}")
            null
        }
    }

    routing {
        webSocket("/ws") {
            logger.info("Cliente WS conectado: $this")

            try {
                for (frame in incoming) {
                    if (frame is Frame.Text) {
                        val text = frame.readText()
                        logger.info("Comando WS recibido: $text")

                        val msg = try {
                            Json.decodeFromString<WsMessage>(text)
                        } catch (e: Exception) {
                            null
                        }

                        if (msg != null) {
                            when (msg.command) {
                                "START" -> {
                                    // Detener solver anterior si existe
                                    activeSolvers[this]?.terminateEarly()

                                     // Cargar configuración
                                     val config = transaction {
                                         val fmt = java.time.format.DateTimeFormatter.ofPattern("HH:mm")
                                         ConfiguracionEntity.all().firstOrNull()?.let {
                                             Configuracion(
                                                 priorizarTutor = it.priorizarTutor,
                                                 tiempoMinimo = it.tiempoMinimo,
                                                 tiempoMaximo = it.tiempoMaximo,
                                                 minutosMaximosProfesor = it.minutosMaximosProfesor,
                                                 priorizarTutorPuntos = it.priorizarTutorPuntos,
                                                 fomentarBloques60Puntos = it.fomentarBloques60Puntos,
                                                 evitarHuecosPuntos = it.evitarHuecosPuntos,
                                                 compactarTempranoPuntos = it.compactarTempranoPuntos,
                                                 horaInicioClases = it.horaInicioClases.format(fmt),
                                                 horaFinClases = it.horaFinClases.format(fmt),
                                                 horaInicioRecreo = it.horaInicioRecreo.format(fmt),
                                                 duracionRecreo = it.duracionRecreo,
                                                 respetarEspecialidad = it.respetarEspecialidad,
                                                 respetarLimiteHoras = it.respetarLimiteHoras,
                                                 respetarDisponibilidad = it.respetarDisponibilidad
                                             )
                                         } ?: Configuracion(
                                             priorizarTutor = true,
                                             tiempoMinimo = 30,
                                             tiempoMaximo = 60,
                                             minutosMaximosProfesor = 1500,
                                             priorizarTutorPuntos = 100,
                                             fomentarBloques60Puntos = 10,
                                             evitarHuecosPuntos = 50,
                                             compactarTempranoPuntos = 5,
                                             horaInicioClases = "09:00",
                                             horaFinClases = "14:00",
                                             horaInicioRecreo = "12:00",
                                             duracionRecreo = 30,
                                             respetarEspecialidad = true,
                                             respetarLimiteHoras = true,
                                             respetarDisponibilidad = true
                                         )
                                     }

                                    // 1. Cargar catálogos y preparar mappings de nombres
                                    val (subjectNameToId, groupCourseNameToId, teacherNameToId) = transaction {
                                        Triple(
                                            AsignaturaEntity.all().associate { it.nombre to it.id.value },
                                            GruposEntity.all().associate { Pair(it.curso.nombre, it.nombre) to it.id.value },
                                            ProfesorEntity.all().associate { it.nombre to it.id.value }
                                        )
                                    }

                                    // 2. Generar franjas horarias (tablero de tiempo)
                                    val franjasDisponibles = mutableListOf<TimeSlot>()
                                    var idFranja = 1
                                    var indiceGlobal = 0

                                    for (i in 1..5) {
                                        val dia = DayOfWeek.of(i)
                                        var horaActual = LocalTime.parse(config.horaInicioClases)
                                        val horaFinDia = LocalTime.parse(config.horaFinClases)
                                        val recreoInicio = LocalTime.parse(config.horaInicioRecreo)
                                        val recreoFin = recreoInicio.plusMinutes(config.duracionRecreo.toLong())

                                        while (horaActual.isBefore(horaFinDia)) {
                                            val horaSiguiente = horaActual.plusMinutes(config.tiempoMinimo.toLong())
                                             val solapaRecreo = horaActual.isBefore(recreoFin) && horaSiguiente.isAfter(recreoInicio)
                                            if (!solapaRecreo) {
                                                franjasDisponibles.add(
                                                    TimeSlot(
                                                        id = "T_${idFranja++}", dayOfWeek = dia,
                                                        startTime = horaActual, endTime = horaSiguiente,
                                                        indiceDeFranja = indiceGlobal++, duracionMinutos = config.tiempoMinimo
                                                    )
                                                )
                                            }
                                            horaActual = horaSiguiente
                                        }
                                    }

                                    // 3. Obtener profesores
                                    val profesorList = transaction {
                                        ProfesorEntity.all().map { it.toProfesor() }
                                    }

                                    // 4. Fabricar lecciones combinando asignaciones (RepartoDocente) y clases del calendario
                                    val leccionesSinAsignar = mutableListOf<Leccion>()
                                    transaction {
                                         val todosLosGrupos = GruposEntity.all().toList()
                                         val todosLosRepartos = RepartoDocenteTable.selectAll().toList()

                                         // Mapear los repartos existentes para búsqueda rápida
                                         val repartoMap = todosLosRepartos.associate {
                                             Pair(it[RepartoDocenteTable.grupoId].value, it[RepartoDocenteTable.asignaturaId].value) to
                                             it[RepartoDocenteTable.profesorId].value
                                         }

                                         todosLosGrupos.forEach { grupoEnt ->
                                             val cursoEnt = grupoEnt.curso
                                             val asignaturasDelCurso = AsignaturaEntity.find { AsignaturaTable.curso eq cursoEnt.id }.toList()

                                             asignaturasDelCurso.forEach { asigEnt ->
                                                 val pId = repartoMap[Pair(grupoEnt.id.value, asigEnt.id.value)]
                                                 val profEnt = pId?.let { ProfesorEntity.findById(it) }

                                                 val minutes = asigEnt.minutos
                                                 val blocksCount = minutes / config.tiempoMinimo

                                                 if (blocksCount > 0) {
                                                     // Obtener clases existentes en la BD para este grupo y materia
                                                     val existingClasses = ClaseEntity.find {
                                                         (ClaseTable.groupId eq grupoEnt.id) and (ClaseTable.subjectId eq asigEnt.id)
                                                     }.toList()

                                                     val pinnedClasses = existingClasses.filter { it.isPinned }
                                                     val unpinnedClasses = existingClasses.filter { !it.isPinned }

                                                     var unpinnedIndex = 0

                                                     val maxBlocks = maxOf(blocksCount, pinnedClasses.size)
                                                     for (b in 1..maxBlocks) {
                                                         val solverGrupo = grupoEnt.toGrupo()
                                                         val solverProfeFijo = profEnt?.toProfesor()

                                                         val lec = Leccion(
                                                             id = UUID.randomUUID().toString(),
                                                             asignatura = asigEnt.nombre,
                                                             grupo = solverGrupo,
                                                             minutosSemanales = minutes,
                                                             profesorFijo = solverProfeFijo
                                                         )

                                                         // Si hay clases fijadas, las asignamos prioritariamente
                                                         if (b <= pinnedClasses.size) {
                                                             val cls = pinnedClasses[b - 1]
                                                             lec.isPinned = true
                                                             lec.timeSlot = findTimeSlot(cls.start, franjasDisponibles) ?: franjasDisponibles.firstOrNull()
                                                             
                                                             // Buscamos el profesor real de la clase fijada en la base de datos
                                                             val actualTeacher = try { profesorList.find { it.nombre == cls.teacher.nombre } } catch (_: Exception) { null }
                                                             val fallbackTeacher = profesorList.find { it.asignaturas.contains(asigEnt.nombre) }
                                                             lec.profesor = actualTeacher ?: solverProfeFijo ?: fallbackTeacher ?: profesorList.firstOrNull()
                                                             
                                                             // Mantenemos el ID original de la base de datos para no perder su identidad
                                                             lec.id = cls.id.value
                                                         } else {
                                                             // Si hay clases no fijadas, warm-start con sus posiciones
                                                             val uCls = unpinnedClasses.getOrNull(unpinnedIndex++)
                                                             if (uCls != null) {
                                                                 lec.timeSlot = findTimeSlot(uCls.start, franjasDisponibles)
                                                                 val actualTeacher = try { profesorList.find { it.nombre == uCls.teacher.nombre } } catch (_: Exception) { null }
                                                                 lec.profesor = actualTeacher ?: solverProfeFijo
                                                                 // Mantenemos el ID original para que puedan ser editadas/fijadas correctamente
                                                                 lec.id = uCls.id.value
                                                             } else {
                                                                 // Nueva clase, el solver elegirá la posición y el profesor
                                                                 lec.timeSlot = null
                                                                 lec.profesor = solverProfeFijo
                                                             }
                                                             lec.isPinned = false
                                                         }
                                                         leccionesSinAsignar.add(lec)
                                                     }
                                                 }
                                             }
                                         }
                                     }

                                    // 5. Iniciar solver de Timefold
                                    val problemaInicial = HorarioSolution(
                                        timeSlotList = franjasDisponibles,
                                        lessonList = leccionesSinAsignar,
                                        configuracion = config,
                                        profesorList = profesorList
                                    )

                                    val solverFactory = SolverFactory.createFromXmlResource<HorarioSolution>("solverConfig.xml")
                                    val solver = solverFactory.buildSolver()
                                    activeSolvers[this] = solver 
                                    var lastSentTime = 0L

                                     solver.addEventListener { event ->
                                         val now = System.currentTimeMillis()
                                         if (lastSentTime == 0L || now - lastSentTime >= 300) {
                                             lastSentTime = now
                                             val bestScore = event.newBestScore as HardSoftScore
                                             val bestSolution = event.newBestSolution

                                             launch(Dispatchers.IO) {
                                                 val listConflictos = obtenerListaConflictos(bestSolution)
                                                 val jsonConflictos = listConflictos.joinToString(",") { "\"${it.replace("\"", "\\\"")}\"" }
                                                 val scoreMsg = """{"type":"scores_updated","hard":${bestScore.hardScore()},"soft":${bestScore.softScore()},"conflictos":[$jsonConflictos]}"""

                                                 val dtos = bestSolution.lessonList
                                                     .filter { it.timeSlot != null && it.profesor != null }
                                                     .map { leccion ->
                                                         val subId = subjectNameToId[leccion.asignatura] ?: 1
                                                         val grpId = groupCourseNameToId[Pair(leccion.grupo.curso, leccion.grupo.nombre)] ?: 1
                                                         val profId = leccion.profesor?.let { teacherNameToId[it.nombre] } ?: 1

                                                         ScheduledClassDto(
                                                             id = leccion.id,
                                                             start = getIsoDateTime(leccion.timeSlot!!.dayOfWeek, leccion.timeSlot!!.startTime),
                                                             end = getIsoDateTime(leccion.timeSlot!!.dayOfWeek, leccion.timeSlot!!.endTime),
                                                             duration = leccion.timeSlot!!.duracionMinutos.toDouble() / 60.0,
                                                             subjectId = subId.toString(),
                                                             groupId = grpId.toString(),
                                                             teacherId = profId.toString(),
                                                             isPinned = leccion.isPinned
                                                         )
                                                     }

                                                 val scheduleJson = Json.encodeToString(dtos)
                                                 val scheduleMsg = """{"type":"schedule_pushed","schedule":$scheduleJson}"""

                                                 try {
                                                     send(Frame.Text(scoreMsg))
                                                     send(Frame.Text(scheduleMsg))
                                                 } catch (e: Exception) {
                                                     logger.warn("Error enviando progreso por WS: ${e.message}")
                                                 }
                                             }
                                         }
                                     }

                                    // Correr el solver asíncronamente
                                    launch(Dispatchers.Default) {
                                        logger.info("Empezando a resolver el horario...")
                                        val solucionFinal = try {
                                            solver.solve(problemaInicial)
                                        } catch (e: Exception) {
                                            logger.error("Error al resolver horario: ${e.message}", e)
                                            null
                                        }

                                        if (solucionFinal != null) {
                                             transaction {
                                                 val solverIds = solucionFinal.lessonList.map { it.id }.toSet()
                                                 ClaseTable.selectAll().forEach { row ->
                                                     val classId = row[ClaseTable.id].value
                                                     if (classId !in solverIds) {
                                                         ClaseTable.deleteWhere { id eq classId }
                                                     }
                                                 }

                                                 solucionFinal.lessonList
                                                     .filter { it.timeSlot != null }
                                                     .forEach { leccion ->
                                                         val subId = subjectNameToId[leccion.asignatura] ?: return@forEach
                                                         val grpId = groupCourseNameToId[Pair(leccion.grupo.curso, leccion.grupo.nombre)] ?: return@forEach
                                                         val profId = leccion.profesor?.let { teacherNameToId[it.nombre] } 
                                                             ?: profesorList.find { it.asignaturas.contains(leccion.asignatura) }?.let { teacherNameToId[it.nombre] } 
                                                             ?: 1

                                                         val existing = ClaseEntity.findById(leccion.id)
                                                         if (existing != null) {
                                                             existing.start = getIsoDateTime(leccion.timeSlot!!.dayOfWeek, leccion.timeSlot!!.startTime)
                                                             existing.end = getIsoDateTime(leccion.timeSlot!!.dayOfWeek, leccion.timeSlot!!.endTime)
                                                             existing.duration = leccion.timeSlot!!.duracionMinutos.toDouble() / 60.0
                                                             existing.subject = AsignaturaEntity.findById(subId)!!
                                                             existing.group = GruposEntity.findById(grpId)!!
                                                             existing.teacher = ProfesorEntity.findById(profId)!!
                                                             existing.isPinned = existing.isPinned || leccion.isPinned
                                                         } else {
                                                             ClaseTable.insert {
                                                                 it[id] = leccion.id
                                                                 it[start] = getIsoDateTime(leccion.timeSlot!!.dayOfWeek, leccion.timeSlot!!.startTime)
                                                                 it[end] = getIsoDateTime(leccion.timeSlot!!.dayOfWeek, leccion.timeSlot!!.endTime)
                                                                 it[duration] = leccion.timeSlot!!.duracionMinutos.toDouble() / 60.0
                                                                 it[subjectId] = EntityID(subId, AsignaturaTable)
                                                                 it[groupId] = EntityID(grpId, GruposTable)
                                                                 it[teacherId] = EntityID(profId, ProfesorTable)
                                                                 it[isPinned] = leccion.isPinned
                                                             }
                                                         }
                                                     }
                                             }

                                            // Enviar el horario final persistido al cliente
                                            try {
                                                val finalDtos = transaction {
                                                    ClaseEntity.all().map { cls ->
                                                        ScheduledClassDto(
                                                            id = cls.id.value,
                                                            start = cls.start,
                                                            end = cls.end,
                                                            duration = cls.duration,
                                                            subjectId = cls.subject.id.value.toString(),
                                                            groupId = cls.group.id.value.toString(),
                                                            teacherId = cls.teacher.id.value.toString(),
                                                            isPinned = cls.isPinned
                                                        )
                                                    }
                                                }
                                                val scheduleJson = Json.encodeToString(finalDtos)
                                                send(Frame.Text("""{"type":"schedule_pushed","schedule":$scheduleJson}"""))
                                                send(Frame.Text("""{"type":"optimization_complete"}"""))
                                            } catch (e: Exception) {
                                                logger.warn("Error enviando resultado final por WS: ${e.message}")
                                            }
                                        }
                                        activeSolvers.remove(this@webSocket)
                                    }
                                }
                                "STOP" -> {
                                    activeSolvers[this]?.terminateEarly()
                                    activeSolvers.remove(this)
                                    send(Frame.Text("""{"type":"optimization_stopped"}"""))
                                }
                            }
                        }
                    }
                }
            } catch (e: Exception) {
                logger.error("Error en WebSocket: ${e.localizedMessage}", e)
            } finally {
                activeSolvers[this]?.terminateEarly()
                activeSolvers.remove(this)
                logger.info("Cliente WS desconectado")
            }
        }
    }
}

private fun obtenerListaConflictos(solution: HorarioSolution): List<String> {
    val contadores = mutableMapOf<String, Int>()
    val lecciones = solution.lessonList

    // 1. Conflictos de profesor (simultaneidad)
    val slotsPorProfesor = lecciones.filter { it.profesor != null && it.timeSlot != null }
        .groupBy { Pair(it.profesor!!.nombre, it.timeSlot!!.id) }
    slotsPorProfesor.forEach { (_, lecsEnSlot) ->
        if (lecsEnSlot.size > 1) {
            contadores["Conflicto de profesor (clases simultáneas)"] =
                (contadores["Conflicto de profesor (clases simultáneas)"] ?: 0) + (lecsEnSlot.size - 1)
        }
    }

    // 2. Conflictos de grupo (simultaneidad)
    val slotsPorGrupo = lecciones.filter { it.timeSlot != null }
        .groupBy { Pair("${it.grupo.curso} ${it.grupo.nombre}", it.timeSlot!!.id) }
    slotsPorGrupo.forEach { (_, lecsEnSlot) ->
        if (lecsEnSlot.size > 1) {
            contadores["Conflicto de grupo (clases simultáneas)"] =
                (contadores["Conflicto de grupo (clases simultáneas)"] ?: 0) + (lecsEnSlot.size - 1)
        }
    }

    // 3. Especialidad incorrecta
    lecciones.forEach { lec ->
        if (lec.profesor != null && !lec.profesor!!.asignaturas.contains(lec.asignatura)) {
            contadores["Especialidad incorrecta"] =
                (contadores["Especialidad incorrecta"] ?: 0) + 1
        }
    }

    // 4. Profesor fijo no respetado
    lecciones.forEach { lec ->
        if (lec.profesorFijo != null && lec.profesor != null && lec.profesor != lec.profesorFijo) {
            contadores["Asignación manual no respetada"] =
                (contadores["Asignación manual no respetada"] ?: 0) + 1
        }
    }

    // 5. Profesor único por materia y grupo
    val grupoAsig = lecciones.filter { it.profesor != null }
        .groupBy { Pair(it.grupo, it.asignatura) }
    grupoAsig.forEach { (_, lecs) ->
        val profes = lecs.map { it.profesor!!.nombre }.distinct()
        if (profes.size > 1) {
            contadores["Varios profesores en misma materia-grupo"] =
                (contadores["Varios profesores en misma materia-grupo"] ?: 0) + (profes.size - 1)
        }
    }

    // 6. Exceso de horas
    val horasPorProfesor = lecciones.filter { it.profesor != null && it.timeSlot != null }
        .groupBy { it.profesor!! }
    horasPorProfesor.forEach { (profe, lecs) ->
        val totalMinutos = lecs.sumOf { it.timeSlot!!.duracionMinutos }
        if (totalMinutos > profe.minutosMaximos) {
            contadores["Exceso de horas del profesor"] =
                (contadores["Exceso de horas del profesor"] ?: 0) + 1
        }
    }

    // 7. Disponibilidad no respetada
    lecciones.forEach { lec ->
        val slot = lec.timeSlot
        val profe = lec.profesor
        if (slot != null && profe != null) {
            val noDisponible = profe.availability.any { av ->
                av.dayOfWeek == slot.dayOfWeek.value &&
                slot.startTime.toString() >= av.startTime &&
                slot.endTime.toString() <= av.endTime
            }
            if (noDisponible) {
                contadores["Disponibilidad no respetada"] =
                    (contadores["Disponibilidad no respetada"] ?: 0) + 1
            }
        }
    }

    // 8. Sin profesor asignado
    val sinProfe = lecciones.count { it.profesor == null }
    if (sinProfe > 0) contadores["Sin profesor asignado"] = sinProfe

    // 9. Sin franja asignada
    val sinSlot = lecciones.count { it.timeSlot == null }
    if (sinSlot > 0) contadores["Sin franja horaria (no cabe)"] = sinSlot

    return contadores.map { (tipo, cantidad) -> "$tipo: $cantidad" }
        .sortedByDescending { it.substringAfterLast(": ").toIntOrNull() ?: 0 }
}