package com.colegio

import com.colegio.DTO.Configuracion
import com.colegio.DTO.ScheduledClassDto
import com.colegio.DTO.WsMessage
import com.colegio.modelos.entities.*
import com.colegio.modelos.tables.*
import com.colegio.solver.Leccion
import com.colegio.solver.OrToolsScheduleSolver
import com.colegio.solver.TimeSlot
import io.ktor.server.application.*
import io.ktor.server.routing.*
import io.ktor.server.websocket.*
import io.ktor.websocket.*
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
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
    val activeJobs = ConcurrentHashMap<DefaultWebSocketServerSession, Job>()
    val activeStopFlags = ConcurrentHashMap<DefaultWebSocketServerSession, java.util.concurrent.atomic.AtomicBoolean>()

    install(WebSockets) {
        maxFrameSize = Long.MAX_VALUE
        masking = false
    }

    fun getIsoDateTime(day: DayOfWeek, time: LocalTime): String =
        com.colegio.routing.DateTimeSlotUtils.getIsoDateTime(day, time)

    fun findTimeSlot(isoStr: String, timeSlots: List<TimeSlot>): TimeSlot? =
        com.colegio.routing.DateTimeSlotUtils.findTimeSlot(isoStr, timeSlots)

    fun findTimeSlots(startIso: String, endIso: String, timeSlots: List<TimeSlot>): List<TimeSlot> =
        com.colegio.routing.DateTimeSlotUtils.findTimeSlots(startIso, endIso, timeSlots)

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
                                    activeJobs[this]?.cancel()

                                    val config = transaction {
                                        val fmt = DateTimeFormatter.ofPattern("HH:mm")
                                        ConfiguracionEntity.all().firstOrNull()?.let {
                                            Configuracion(
                                                priorizarTutor = it.priorizarTutor,
                                                tiempoMinimo = it.tiempoMinimo,
                                                tiempoMaximo = it.tiempoMaximo,
                                                minutosMaximosProfesor = it.minutosMaximosProfesor,
                                                priorizarTutorPuntos = it.priorizarTutorPuntos,
                                                fomentarBloques60Puntos = it.fomentarBloques60Puntos,
                                                minimizarAsignaturasDistintas = it.minimizarAsignaturasDistintas,
                                                minimizarAsignaturasPuntos = it.minimizarAsignaturasPuntos,
                                                limiteTiempoSegundos = it.limiteTiempoSegundos,
                                                tiempoEstancamientoSegundos = it.tiempoEstancamientoSegundos,
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
                                            limiteTiempoSegundos = 18000.0,
                                            tiempoEstancamientoSegundos = 60.0,
                                            horaInicioClases = "09:00",
                                            horaFinClases = "14:00",
                                            horaInicioRecreo = "12:00",
                                            duracionRecreo = 30,
                                            respetarEspecialidad = true,
                                            respetarLimiteHoras = true,
                                            respetarDisponibilidad = true
                                        )
                                    }

                                    val (subjectNameToId, groupCourseNameToId, teacherNameToId) = transaction {
                                        Triple(
                                            AsignaturaEntity.all().associate { it.nombre to it.id.value },
                                            GruposEntity.all().associate { Pair(it.curso.nombre, it.nombre) to it.id.value },
                                            ProfesorEntity.all().associate { it.nombre to it.id.value }
                                        )
                                    }

                                    val franjasDisponibles = com.colegio.solver.SolverLessonDataLoader.generateTimeSlots(config)

                                    val profesorList = transaction {
                                        ProfesorEntity.all().map { it.toProfesor() }
                                    }

                                    val leccionesSinAsignar = mutableListOf<Leccion>()
                                    transaction {
                                        val todosLosGrupos = GruposEntity.all().toList()
                                        val todosLosRepartos = RepartoDocenteTable.selectAll().toList()

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
                                                val blocksCount = com.colegio.solver.SolverLessonDataLoader.calculateBlocksCount(minutes, config.tiempoMinimo)

                                                if (blocksCount > 0) {
                                                    val existingClasses = ClaseEntity.find {
                                                        (ClaseTable.groupId eq grupoEnt.id) and (ClaseTable.subjectId eq asigEnt.id)
                                                    }.toList()

                                                    val expandedPinnedSlots = mutableListOf<Triple<ClaseEntity, TimeSlot, String>>()
                                                    val expandedUnpinnedSlots = mutableListOf<Triple<ClaseEntity, TimeSlot?, String>>()

                                                    existingClasses.forEach { cls ->
                                                        val slots = findTimeSlots(cls.start, cls.end, franjasDisponibles)
                                                        if (cls.isPinned) {
                                                            slots.forEachIndexed { idx, slot ->
                                                                val classId = if (idx == 0) cls.id.value else "${cls.id.value}_sub_${idx + 1}"
                                                                expandedPinnedSlots.add(Triple(cls, slot, classId))
                                                            }
                                                        } else {
                                                            if (slots.isNotEmpty()) {
                                                                slots.forEachIndexed { idx, slot ->
                                                                    val classId = if (idx == 0) cls.id.value else "${cls.id.value}_sub_${idx + 1}"
                                                                    expandedUnpinnedSlots.add(Triple(cls, slot, classId))
                                                                }
                                                            } else {
                                                                expandedUnpinnedSlots.add(Triple(cls, null, cls.id.value))
                                                            }
                                                        }
                                                    }

                                                    var unpinnedIndex = 0

                                                    for (b in 1..blocksCount) {
                                                        val solverGrupo = grupoEnt.toGrupo()
                                                        val solverProfeFijo = profEnt?.toProfesor()

                                                        val lec = Leccion(
                                                            id = UUID.randomUUID().toString(),
                                                            asignatura = asigEnt.nombre,
                                                            grupo = solverGrupo,
                                                            minutosSemanales = minutes,
                                                            profesorFijo = solverProfeFijo
                                                        )

                                                        if (b <= expandedPinnedSlots.size) {
                                                            val (cls, slot, slotClassId) = expandedPinnedSlots[b - 1]
                                                            lec.isPinned = true
                                                            lec.timeSlot = slot

                                                            val actualTeacher = try { profesorList.find { it.nombre == cls.teacher.nombre } } catch (_: Exception) { null }
                                                            val fallbackTeacher = profesorList.find { it.asignaturas.contains(asigEnt.nombre) }
                                                            lec.profesor = actualTeacher ?: solverProfeFijo ?: fallbackTeacher ?: profesorList.firstOrNull()
                                                            lec.id = slotClassId
                                                        } else {
                                                            val uTriple = expandedUnpinnedSlots.getOrNull(unpinnedIndex++)
                                                            if (uTriple != null) {
                                                                val (cls, slot, slotClassId) = uTriple
                                                                lec.timeSlot = slot
                                                                val actualTeacher = try { profesorList.find { it.nombre == cls.teacher.nombre } } catch (_: Exception) { null }
                                                                lec.profesor = actualTeacher ?: solverProfeFijo
                                                                lec.id = slotClassId
                                                            } else {
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

                                    val stopFlag = java.util.concurrent.atomic.AtomicBoolean(false)
                                    activeStopFlags[this] = stopFlag

                                    val progressChannel = Channel<com.colegio.solver.SolverProgress>(capacity = Channel.UNLIMITED)

                                    // Worker coroutine que saca las soluciones de la cola y las envía por WebSocket
                                    val workerJob = launch(Dispatchers.IO) {
                                        for (progress in progressChannel) {
                                            val jsonConflictos = progress.conflictos.joinToString(",") { "\"${it.replace("\"", "\\\"")}\"" }
                                            val pct = if (progress.bestBound > 0) minOf(100.0, (progress.rawObjective.toDouble() / progress.bestBound.toDouble()) * 100.0) else 0.0
                                            val scoreMsg = """{"type":"scores_updated","hard":${progress.hardScore},"soft":${progress.softScore},"bound":${progress.bestBound},"rawObjective":${progress.rawObjective},"porcentaje":$pct,"conflictos":[$jsonConflictos]}"""

                                            val dtos = progress.solvedLessons
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

                                    val job = launch(Dispatchers.Default) {
                                        logger.info("Iniciando resolución con Google OR-Tools (CP-SAT Solver)...")

                                        val resultado = try {
                                            OrToolsScheduleSolver.solve(
                                                timeSlots = franjasDisponibles,
                                                lessons = leccionesSinAsignar,
                                                teachers = profesorList,
                                                config = config,
                                                timeLimitSeconds = if (config.limiteTiempoSegundos > 0) config.limiteTiempoSegundos else 360000.0,
                                                onProgress = { progress ->
                                                    progressChannel.trySend(progress)
                                                },
                                                isStopped = { stopFlag.get() }
                                            )
                                        } catch (e: Exception) {
                                            logger.error("Error al ejecutar Google OR-Tools solver: ${e.message}", e)
                                            null
                                        } finally {
                                            progressChannel.close()
                                            workerJob.join()
                                        }

                                        if (resultado != null) {
                                            if (resultado.isFeasible) {
                                                transaction {
                                                    val solverIds = resultado.solvedLessons.map { it.id }.toSet()
                                                    ClaseTable.selectAll().forEach { row ->
                                                        val classId = row[ClaseTable.id].value
                                                        if (classId !in solverIds) {
                                                            ClaseTable.deleteWhere { id eq classId }
                                                        }
                                                    }

                                                    resultado.solvedLessons
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

                                                try {
                                                    val finalDtos = transaction {
                                                        ClaseEntity.all().mapNotNull { cls ->
                                                            try {
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
                                                            } catch (e: Exception) {
                                                                null
                                                            }
                                                        }
                                                    }
                                                    val scheduleJson = Json.encodeToString(finalDtos)
                                                    val jsonConflictos = Json.encodeToString(resultado.conflictos)
                                                    val pct = if (resultado.bestBound > 0) minOf(100.0, (resultado.rawObjective.toDouble() / resultado.bestBound.toDouble()) * 100.0) else 100.0
                                                    val scoreMsg = """{"type":"scores_updated","hard":${resultado.hardScore},"soft":${resultado.softScore},"bound":${resultado.bestBound},"rawObjective":${resultado.rawObjective},"porcentaje":$pct,"conflictos":$jsonConflictos}"""
                                                    send(Frame.Text(scoreMsg))
                                                    send(Frame.Text("""{"type":"schedule_pushed","schedule":$scheduleJson}"""))
                                                    send(Frame.Text("""{"type":"optimization_complete"}"""))
                                                } catch (e: Exception) {
                                                    logger.warn("Error enviando resultado final por WS: ${e.message}")
                                                }
                                            } else {
                                                // El horario NO es viable
                                                logger.warn("❌ El horario es INVIABLE. Detalle de los ${resultado.conflictos.size} conflictos:")
                                                resultado.conflictos.forEach { conflicto ->
                                                    logger.warn("   • $conflicto")
                                                }
                                                 try {
                                                     val jsonConflictos = Json.encodeToString(resultado.conflictos)
                                                     val scoreMsg = """{"type":"scores_updated","hard":${resultado.hardScore},"soft":${resultado.softScore},"bound":${resultado.bestBound},"conflictos":$jsonConflictos}"""
                                                     send(Frame.Text(scoreMsg))
                                                 } catch (e: Exception) {
                                                     logger.warn("Error enviando notificacion de inviabilidad por WS: ${e.message}")
                                                 }
                                            }
                                        }
                                        activeJobs.remove(this@webSocket)
                                    }
                                    activeJobs[this] = job
                                }
                                 "STOP" -> {
                                     activeStopFlags[this]?.set(true)
                                     activeJobs[this]?.cancel()
                                     activeJobs.remove(this)
                                     activeStopFlags.remove(this)
                                     send(Frame.Text("""{"type":"optimization_stopped"}"""))
                                 }
                            }
                        }
                    }
                }
            } catch (e: Exception) {
                logger.error("Error en WebSocket: ${e.localizedMessage}", e)
            } finally {
                activeJobs[this]?.cancel()
                activeJobs.remove(this)
                logger.info("Cliente WS desconectado")
            }
        }
    }
}