package com.colegio

import com.colegio.modelos.entities.*
import com.colegio.modelos.tables.*
import io.ktor.http.HttpStatusCode
import io.ktor.server.application.*
import io.ktor.server.http.content.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import kotlinx.serialization.Serializable
import org.slf4j.LoggerFactory
import org.jetbrains.exposed.dao.id.EntityID
import org.jetbrains.exposed.sql.SizedCollection
import org.jetbrains.exposed.sql.deleteWhere
import org.jetbrains.exposed.sql.insert
import org.jetbrains.exposed.sql.selectAll
import org.jetbrains.exposed.sql.SqlExpressionBuilder.eq
import org.jetbrains.exposed.sql.transactions.transaction

import com.colegio.DTO.*

@Serializable
data class PrevalidationResult(
    val viable: Boolean,
    val checks: List<PrevalidationCheck>
)

@Serializable
data class PrevalidationCheck(
    val name: String,
    val status: String,
    val message: String,
    val details: List<String> = emptyList()
)

// --- AUXILIAR DE PARSEO DE IDS ---
fun parseId(idStr: String): Int {
    val clean = idStr.replace(Regex("^[a-zA-Z]+-"), "")
    return clean.toIntOrNull() ?: 1
}

fun Application.configureRouting() {
    val routingLogger = LoggerFactory.getLogger("FrontendLog")

    routing {
        staticResources("/", "static", index = "index.html")

        route("/api/v1") {

            // --- LOG DE ERRORES DEL FRONTEND ---
            post("/log") {
                @Serializable data class FrontendLogEntry(val level: String = "error", val message: String = "", val source: String = "", val line: Int = 0, val stack: String = "")
                try {
                    val entry = call.receive<FrontendLogEntry>()
                    val msg = "[BROWSER] ${entry.message} (${entry.source}:${entry.line})"
                    when (entry.level) {
                        "warn"  -> routingLogger.warn(msg + if (entry.stack.isNotBlank()) "\n${entry.stack}" else "")
                        else    -> routingLogger.error(msg + if (entry.stack.isNotBlank()) "\n${entry.stack}" else "")
                    }
                } catch (_: Exception) {}
                call.respond(HttpStatusCode.OK)
            }

            // --- ASIGNATURAS (SUBJECTS) ---
            get("/subjects") {
                val list = transaction {
                    AsignaturaEntity.all().map {
                        SubjectDto(
                            id = it.id.value.toString(),
                            name = it.nombre,
                            hours = it.minutos.toDouble() / 60.0,
                            courseId = it.curso.id.value.toString(),
                            teachers = it.profesores.map { p -> p.id.value.toString() }
                        )
                    }
                }
                call.respond(list)
            }

            post("/subjects") {
                val req = call.receive<SubjectDto>()
                val res = transaction {
                    val courseEntity = CursosEntity.findById(parseId(req.courseId)) ?: return@transaction null
                    val teacherEntities = req.teachers.mapNotNull { ProfesorEntity.findById(parseId(it)) }
                    val entity = AsignaturaEntity.new {
                        nombre = req.name
                        minutos = (req.hours * 60).toInt()
                        curso = courseEntity
                    }
                    entity.profesores = SizedCollection(teacherEntities)
                    SubjectDto(
                        id = entity.id.value.toString(),
                        name = entity.nombre,
                        hours = entity.minutos.toDouble() / 60.0,
                        courseId = entity.curso.id.value.toString(),
                        teachers = entity.profesores.map { p -> p.id.value.toString() }
                    )
                }
                if (res != null) call.respond(res) else call.respond(HttpStatusCode.BadRequest, "Course not found")
            }

            put("/subjects") {
                val req = call.receive<SubjectDto>()
                val res = transaction {
                    val entity = AsignaturaEntity.findById(parseId(req.id)) ?: return@transaction null
                    val courseEntity = CursosEntity.findById(parseId(req.courseId)) ?: return@transaction null
                    val teacherEntities = req.teachers.mapNotNull { ProfesorEntity.findById(parseId(it)) }
                    entity.nombre = req.name
                    entity.minutos = (req.hours * 60).toInt()
                    entity.curso = courseEntity
                    entity.profesores = SizedCollection(teacherEntities)
                    SubjectDto(
                        id = entity.id.value.toString(),
                        name = entity.nombre,
                        hours = entity.minutos.toDouble() / 60.0,
                        courseId = entity.curso.id.value.toString(),
                        teachers = entity.profesores.map { p -> p.id.value.toString() }
                    )
                }
                if (res != null) call.respond(res) else call.respond(HttpStatusCode.NotFound)
            }

            delete("/subjects/{id}") {
                val idStr = call.parameters["id"] ?: return@delete call.respond(HttpStatusCode.BadRequest)
                transaction {
                    AsignaturaEntity.findById(parseId(idStr))?.delete()
                }
                call.respond(HttpStatusCode.OK, mapOf("success" to true))
            }

            // --- PROFESORES (TEACHERS) ---
            get("/teachers") {
                val list = transaction {
                    ProfesorEntity.all().map {
                        val availList = try {
                            kotlinx.serialization.json.Json.decodeFromString<List<TeacherAvailabilityDto>>(it.disponibilidad)
                        } catch (e: Exception) {
                            emptyList()
                        }
                        TeacherDto(
                            id = it.id.value.toString(),
                            name = it.nombre,
                            maxHours = it.minutosMaximos.toDouble() / 60.0,
                            color = it.color,
                            subjects = it.asignaturas.map { sub -> sub.id.value.toString() },
                            availability = availList
                        )
                    }
                }
                call.respond(list)
            }

            post("/teachers") {
                val req = call.receive<TeacherDto>()
                val res = transaction {
                    val subjectEntities = req.subjects.mapNotNull { AsignaturaEntity.findById(parseId(it)) }
                    val availJson = try {
                        kotlinx.serialization.json.Json.encodeToString(req.availability)
                    } catch (e: Exception) {
                        "[]"
                    }
                    val entity = ProfesorEntity.new {
                        nombre = req.name
                        minutosMaximos = (req.maxHours * 60).toInt()
                        color = req.color
                        disponibilidad = availJson
                    }
                    entity.asignaturas = SizedCollection(subjectEntities)
                    val availList = try {
                        kotlinx.serialization.json.Json.decodeFromString<List<TeacherAvailabilityDto>>(entity.disponibilidad)
                    } catch (e: Exception) {
                        emptyList()
                    }
                    TeacherDto(
                        id = entity.id.value.toString(),
                        name = entity.nombre,
                        maxHours = entity.minutosMaximos.toDouble() / 60.0,
                        color = entity.color,
                        subjects = entity.asignaturas.map { sub -> sub.id.value.toString() },
                        availability = availList
                    )
                }
                call.respond(res)
            }

            put("/teachers") {
                val req = call.receive<TeacherDto>()
                val res = transaction {
                    val entity = ProfesorEntity.findById(parseId(req.id)) ?: return@transaction null
                    val subjectEntities = req.subjects.mapNotNull { AsignaturaEntity.findById(parseId(it)) }
                    val availJson = try {
                        kotlinx.serialization.json.Json.encodeToString(req.availability)
                    } catch (e: Exception) {
                        "[]"
                    }
                    entity.nombre = req.name
                    entity.minutosMaximos = (req.maxHours * 60).toInt()
                    entity.color = req.color
                    entity.disponibilidad = availJson
                    entity.asignaturas = SizedCollection(subjectEntities)
                    val availList = try {
                        kotlinx.serialization.json.Json.decodeFromString<List<TeacherAvailabilityDto>>(entity.disponibilidad)
                    } catch (e: Exception) {
                        emptyList()
                    }
                    TeacherDto(
                        id = entity.id.value.toString(),
                        name = entity.nombre,
                        maxHours = entity.minutosMaximos.toDouble() / 60.0,
                        color = entity.color,
                        subjects = entity.asignaturas.map { sub -> sub.id.value.toString() },
                        availability = availList
                    )
                }
                if (res != null) call.respond(res) else call.respond(HttpStatusCode.NotFound)
            }

            delete("/teachers/{id}") {
                val idStr = call.parameters["id"] ?: return@delete call.respond(HttpStatusCode.BadRequest)
                transaction {
                    ProfesorEntity.findById(parseId(idStr))?.delete()
                }
                call.respond(HttpStatusCode.OK, mapOf("success" to true))
            }

            // --- CURSOS Y GRUPOS (COURSES) ---
            get("/courses") {
                val list = transaction {
                    CursosEntity.all().map { course ->
                        val subjects = AsignaturaEntity.find { AsignaturaTable.curso eq course.id }.map { it.id.value.toString() }
                        val groups = GruposEntity.find { GruposTable.curso eq course.id }.map { group ->
                            val assignments = RepartoDocenteTable.selectAll()
                                .where { RepartoDocenteTable.grupoId eq group.id }
                                .associate { it[RepartoDocenteTable.asignaturaId].value.toString() to it[RepartoDocenteTable.profesorId].value.toString() }
                            CourseGroupDto(
                                id = group.id.value.toString(),
                                name = group.nombre,
                                tutorId = group.tutor.id.value.toString(),
                                assignments = assignments
                            )
                        }
                        CourseDto(
                            id = course.id.value.toString(),
                            name = course.nombre,
                            subjects = subjects,
                            groups = groups
                        )
                    }
                }
                call.respond(list)
            }

            post("/courses") {
                val req = call.receive<CourseDto>()
                val res = transaction {
                    val entity = CursosEntity.new {
                        nombre = req.name
                    }
                    CourseDto(
                        id = entity.id.value.toString(),
                        name = entity.nombre,
                        subjects = emptyList(),
                        groups = emptyList()
                    )
                }
                call.respond(res)
            }

            put("/courses") {
                val req = call.receive<CourseDto>()
                val res = transaction {
                    val entity = CursosEntity.findById(parseId(req.id)) ?: return@transaction null
                    entity.nombre = req.name
                    val subjects = AsignaturaEntity.find { AsignaturaTable.curso eq entity.id }.map { it.id.value.toString() }
                    val groups = GruposEntity.find { GruposTable.curso eq entity.id }.map { group ->
                        val assignments = RepartoDocenteTable.selectAll()
                            .where { RepartoDocenteTable.grupoId eq group.id }
                            .associate { it[RepartoDocenteTable.asignaturaId].value.toString() to it[RepartoDocenteTable.profesorId].value.toString() }
                        CourseGroupDto(
                            id = group.id.value.toString(),
                            name = group.nombre,
                            tutorId = group.tutor.id.value.toString(),
                            assignments = assignments
                        )
                    }
                    CourseDto(
                        id = entity.id.value.toString(),
                        name = entity.nombre,
                        subjects = subjects,
                        groups = groups
                    )
                }
                if (res != null) call.respond(res) else call.respond(HttpStatusCode.NotFound)
            }

            delete("/courses/{id}") {
                val idStr = call.parameters["id"] ?: return@delete call.respond(HttpStatusCode.BadRequest)
                transaction {
                    CursosEntity.findById(parseId(idStr))?.delete()
                }
                call.respond(HttpStatusCode.OK, mapOf("success" to true))
            }

            put("/courses/{courseId}/groups") {
                val courseIdStr = call.parameters["courseId"] ?: return@put call.respond(HttpStatusCode.BadRequest)
                val groupDtos = call.receive<List<CourseGroupDto>>()
                val res = transaction {
                    val courseEntity = CursosEntity.findById(parseId(courseIdStr)) ?: return@transaction null
                    val incomingGroupIds = groupDtos.mapNotNull { it.id.toIntOrNull() }
                    
                    // Borrar grupos ausentes
                    GruposEntity.find { GruposTable.curso eq courseEntity.id }.forEach { g ->
                        if (g.id.value !in incomingGroupIds) {
                            g.delete()
                        }
                    }

                    groupDtos.map { gDto ->
                        val tutorEntity = ProfesorEntity.findById(parseId(gDto.tutorId)) ?: ProfesorEntity.all().first()
                        val groupEntity = if (gDto.id.toIntOrNull() != null) {
                            val existing = GruposEntity.findById(gDto.id.toInt())
                            if (existing != null) {
                                existing.nombre = gDto.name
                                existing.tutor = tutorEntity
                                existing
                            } else {
                                GruposEntity.new {
                                    nombre = gDto.name
                                    curso = courseEntity
                                    tutor = tutorEntity
                                }
                            }
                        } else {
                            GruposEntity.new {
                                nombre = gDto.name
                                curso = courseEntity
                                tutor = tutorEntity
                            }
                        }

                        // Actualizar asignaciones
                        RepartoDocenteTable.deleteWhere { RepartoDocenteTable.grupoId eq groupEntity.id }
                        gDto.assignments.forEach { (subId, profId) ->
                            RepartoDocenteTable.insert {
                                it[RepartoDocenteTable.grupoId] = groupEntity.id
                                it[RepartoDocenteTable.asignaturaId] = EntityID(parseId(subId), AsignaturaTable)
                                it[RepartoDocenteTable.profesorId] = EntityID(parseId(profId), ProfesorTable)
                            }
                        }
                    }
                    // Devolver el curso actualizado como DTO (reutilizamos courseEntity ya declarada arriba)
                    val updatedGroups = GruposEntity.find { GruposTable.curso eq courseEntity.id }.map { group ->
                        val assignments = RepartoDocenteTable.selectAll()
                            .where { RepartoDocenteTable.grupoId eq group.id }
                            .associate { row ->
                                row[RepartoDocenteTable.asignaturaId].value.toString() to
                                row[RepartoDocenteTable.profesorId].value.toString()
                            }
                        CourseGroupDto(id = group.id.value.toString(), name = group.nombre, tutorId = group.tutor.id.value.toString(), assignments = assignments)
                    }
                    CourseDto(id = courseEntity.id.value.toString(), name = courseEntity.nombre, subjects = emptyList(), groups = updatedGroups)
                }
                if (res != null) call.respond(res) else call.respond(HttpStatusCode.NotFound)
            }

            // --- CLASES PROGRAMADAS (SCHEDULED CLASSES) ---
            get("/scheduledClasses") {
                val list = transaction {
                    ClaseEntity.all().map {
                        ScheduledClassDto(
                            id = it.id.value,
                            start = it.start,
                            end = it.end,
                            duration = it.duration,
                            subjectId = it.subject.id.value.toString(),
                            groupId = it.group.id.value.toString(),
                            teacherId = it.teacher.id.value.toString(),
                            isPinned = it.isPinned
                        )
                    }
                }
                call.respond(list)
            }

            post("/scheduledClasses") {
                val req = call.receive<ScheduledClassDto>()
                val res = transaction {
                    val sub = AsignaturaEntity.findById(parseId(req.subjectId)) ?: return@transaction null
                    val grp = GruposEntity.findById(parseId(req.groupId)) ?: return@transaction null
                    val prof = ProfesorEntity.findById(parseId(req.teacherId)) ?: return@transaction null
                    val entity = ClaseEntity.new(req.id) {
                        start = req.start
                        end = req.end
                        duration = req.duration
                        subject = sub
                        group = grp
                        teacher = prof
                        isPinned = req.isPinned
                    }
                    ScheduledClassDto(
                        id = entity.id.value,
                        start = entity.start,
                        end = entity.end,
                        duration = entity.duration,
                        subjectId = entity.subject.id.value.toString(),
                        groupId = entity.group.id.value.toString(),
                        teacherId = entity.teacher.id.value.toString(),
                        isPinned = entity.isPinned
                    )
                }
                if (res != null) call.respond(res) else call.respond(HttpStatusCode.BadRequest, "Entities not found")
            }

            put("/scheduledClasses") {
                val req = call.receive<ScheduledClassDto>()
                val res = transaction {
                    var entity = ClaseEntity.findById(req.id)
                    val sub = AsignaturaEntity.findById(parseId(req.subjectId)) ?: return@transaction null
                    val grp = GruposEntity.findById(parseId(req.groupId)) ?: return@transaction null
                    val prof = ProfesorEntity.findById(parseId(req.teacherId)) ?: return@transaction null

                    if (entity != null) {
                        entity.start = req.start
                        entity.end = req.end
                        entity.duration = req.duration
                        entity.subject = sub
                        entity.group = grp
                        entity.teacher = prof
                        entity.isPinned = req.isPinned
                    } else {
                        entity = ClaseEntity.new(req.id) {
                            start = req.start
                            end = req.end
                            duration = req.duration
                            subject = sub
                            group = grp
                            teacher = prof
                            isPinned = req.isPinned
                        }
                    }

                    ScheduledClassDto(
                        id = entity.id.value,
                        start = entity.start,
                        end = entity.end,
                        duration = entity.duration,
                        subjectId = entity.subject.id.value.toString(),
                        groupId = entity.group.id.value.toString(),
                        teacherId = entity.teacher.id.value.toString(),
                        isPinned = entity.isPinned
                    )
                }
                if (res != null) call.respond(res) else call.respond(HttpStatusCode.BadRequest, "Entities not found")
            }

            delete("/scheduledClasses/{id}") {
                val idStr = call.parameters["id"] ?: return@delete call.respond(HttpStatusCode.BadRequest)
                transaction {
                    ClaseEntity.findById(idStr)?.delete()
                }
                call.respond(HttpStatusCode.OK, mapOf("success" to true))
            }

            delete("/scheduledClasses/group/{groupId}") {
                val groupIdStr = call.parameters["groupId"] ?: return@delete call.respond(HttpStatusCode.BadRequest)
                transaction {
                    org.jetbrains.exposed.sql.SqlExpressionBuilder.run {
                        ClaseTable.deleteWhere { ClaseTable.groupId eq parseId(groupIdStr) }
                    }
                }
                call.respond(HttpStatusCode.OK, mapOf("success" to true))
            }

            // --- CONFIGURACIÓN (CONFIG) ---
            get("/config") {
                val conf = transaction {
                    ConfiguracionEntity.all().firstOrNull()?.let {
                        val fmt = java.time.format.DateTimeFormatter.ofPattern("HH:mm")
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
                call.respond(conf)
            }

            put("/config") {
                val req = call.receive<Configuracion>()
                val res = transaction {
                    val entity = ConfiguracionEntity.all().firstOrNull() ?: ConfiguracionEntity.new {}
                    entity.priorizarTutor = req.priorizarTutor
                    entity.tiempoMinimo = req.tiempoMinimo
                    entity.tiempoMaximo = req.tiempoMaximo
                    entity.minutosMaximosProfesor = req.minutosMaximosProfesor
                    entity.priorizarTutorPuntos = req.priorizarTutorPuntos
                    entity.fomentarBloques60Puntos = req.fomentarBloques60Puntos
                    entity.evitarHuecosPuntos = req.evitarHuecosPuntos
                    entity.compactarTempranoPuntos = req.compactarTempranoPuntos
                    
                    entity.horaInicioClases = java.time.LocalTime.parse(req.horaInicioClases)
                    entity.horaFinClases = java.time.LocalTime.parse(req.horaFinClases)
                    entity.horaInicioRecreo = java.time.LocalTime.parse(req.horaInicioRecreo)
                    entity.duracionRecreo = req.duracionRecreo
                    entity.respetarEspecialidad = req.respetarEspecialidad
                    entity.respetarLimiteHoras = req.respetarLimiteHoras
                    entity.respetarDisponibilidad = req.respetarDisponibilidad

                    val fmt = java.time.format.DateTimeFormatter.ofPattern("HH:mm")
                    Configuracion(
                        priorizarTutor = entity.priorizarTutor,
                        tiempoMinimo = entity.tiempoMinimo,
                        tiempoMaximo = entity.tiempoMaximo,
                        minutosMaximosProfesor = entity.minutosMaximosProfesor,
                        priorizarTutorPuntos = entity.priorizarTutorPuntos,
                        fomentarBloques60Puntos = entity.fomentarBloques60Puntos,
                        evitarHuecosPuntos = entity.evitarHuecosPuntos,
                        compactarTempranoPuntos = entity.compactarTempranoPuntos,
                        horaInicioClases = entity.horaInicioClases.format(fmt),
                        horaFinClases = entity.horaFinClases.format(fmt),
                        horaInicioRecreo = entity.horaInicioRecreo.format(fmt),
                        duracionRecreo = entity.duracionRecreo,
                        respetarEspecialidad = entity.respetarEspecialidad,
                        respetarLimiteHoras = entity.respetarLimiteHoras,
                        respetarDisponibilidad = entity.respetarDisponibilidad
                    )
                }
                call.respond(res)
            }

            get("/prevalidation") {
                val result = transaction {
                    val checks = mutableListOf<PrevalidationCheck>()
                    var viable = true
                    
                    val allSubjects = AsignaturaEntity.all().toList()
                    val allTeachers = ProfesorEntity.all().toList()
                    val allGroups = GruposEntity.all().toList()
                    val allCourses = CursosEntity.all().toList()
                    val config = ConfiguracionEntity.all().firstOrNull()
                    
                    // 1. Cobertura de asignaturas
                    val subjectsWithoutTeachers = allSubjects.filter { it.profesores.empty() }
                    if (subjectsWithoutTeachers.isNotEmpty()) {
                        viable = false
                        checks.add(PrevalidationCheck(
                            name = "Cobertura de asignaturas",
                            status = "error",
                            message = "Existen asignaturas sin profesores cualificados asignados.",
                            details = subjectsWithoutTeachers.map { "La asignatura '${it.nombre}' no tiene profesores." }
                        ))
                    } else {
                        checks.add(PrevalidationCheck(
                            name = "Cobertura de asignaturas",
                            status = "ok",
                            message = "Todas las asignaturas tienen al menos un profesor cualificado."
                        ))
                    }
                    
                    // 2. Capacidad total de horas
                    var totalDemand = 0
                    allSubjects.forEach { sub ->
                        val groupsWithSub = allGroups.filter { it.curso.id == sub.curso.id }
                        totalDemand += (sub.minutos * groupsWithSub.size)
                    }
                    val totalSupply = allTeachers.sumOf { it.minutosMaximos }
                    
                    if (totalDemand > totalSupply) {
                        viable = false
                        checks.add(PrevalidationCheck(
                            name = "Capacidad total de horas",
                            status = "error",
                            message = "La demanda de horas supera la capacidad total de los profesores.",
                            details = listOf("Demanda total: $totalDemand minutos", "Capacidad total: $totalSupply minutos")
                        ))
                    } else if (totalDemand > (totalSupply * 0.8)) {
                        checks.add(PrevalidationCheck(
                            name = "Capacidad total de horas",
                            status = "warning",
                            message = "La demanda de horas está cerca de la capacidad total de los profesores (más del 80%).",
                            details = listOf("Demanda total: $totalDemand minutos", "Capacidad total: $totalSupply minutos")
                        ))
                    } else {
                        checks.add(PrevalidationCheck(
                            name = "Capacidad total de horas",
                            status = "ok",
                            message = "La capacidad total de horas es suficiente."
                        ))
                    }
                    
                    // 3. Capacidad por asignatura
                    val capacityIssues = mutableListOf<String>()
                    var subjectCapacityOk = true
                    allSubjects.forEach { sub ->
                        val groupsWithSubCount = allGroups.count { it.curso.id == sub.curso.id }
                        val demandForSub = sub.minutos * groupsWithSubCount
                        val supplyForSub = sub.profesores.sumOf { it.minutosMaximos }
                        
                        if (demandForSub > supplyForSub) {
                            subjectCapacityOk = false
                            capacityIssues.add("Asignatura '${sub.nombre}': Demanda de $demandForSub min, pero los profesores cualificados solo suman $supplyForSub min.")
                        }
                    }
                    if (!subjectCapacityOk) {
                        viable = false
                        checks.add(PrevalidationCheck(
                            name = "Capacidad por asignatura",
                            status = "error",
                            message = "Algunas asignaturas demandan más horas de las que pueden cubrir sus profesores cualificados.",
                            details = capacityIssues
                        ))
                    } else {
                        checks.add(PrevalidationCheck(
                            name = "Capacidad por asignatura",
                            status = "ok",
                            message = "Todas las asignaturas tienen suficiente capacidad por parte de sus profesores."
                        ))
                    }
                    
                    // 4. Cuellos de botella por franja
                    if (allGroups.size > allTeachers.size) {
                        checks.add(PrevalidationCheck(
                            name = "Cuellos de botella por franja",
                            status = "warning",
                            message = "Hay más grupos que profesores. No se podrán programar clases para todos los grupos en paralelo en una misma franja.",
                            details = listOf("Grupos totales: ${allGroups.size}", "Profesores totales: ${allTeachers.size}")
                        ))
                    } else {
                        checks.add(PrevalidationCheck(
                            name = "Cuellos de botella por franja",
                            status = "ok",
                            message = "Hay suficientes profesores para dar clase a todos los grupos en paralelo."
                        ))
                    }
                    
                    // 5. Grupos sin asignaturas
                    val coursesWithoutSubjects = allCourses.filter { course -> 
                        val groupsCount = allGroups.count { it.curso.id == course.id }
                        val subjectsCount = allSubjects.count { it.curso.id == course.id }
                        groupsCount > 0 && subjectsCount == 0
                    }
                    if (coursesWithoutSubjects.isNotEmpty()) {
                        checks.add(PrevalidationCheck(
                            name = "Grupos sin asignaturas",
                            status = "warning",
                            message = "Existen cursos con grupos pero sin asignaturas definidas.",
                            details = coursesWithoutSubjects.map { "El curso '${it.nombre}' tiene grupos pero ninguna asignatura." }
                        ))
                    } else {
                        checks.add(PrevalidationCheck(
                            name = "Grupos sin asignaturas",
                            status = "ok",
                            message = "Todos los cursos con grupos tienen asignaturas."
                        ))
                    }
                    
                    // 6. Profesores sin asignaturas
                    val teachersWithoutSubjects = allTeachers.filter { it.asignaturas.empty() }
                    if (teachersWithoutSubjects.isNotEmpty()) {
                        checks.add(PrevalidationCheck(
                            name = "Profesores sin asignaturas",
                            status = "warning",
                            message = "Hay profesores sin ninguna asignatura asignada.",
                            details = teachersWithoutSubjects.map { "El profesor '${it.nombre}' no imparte ninguna asignatura." }
                        ))
                    } else {
                        checks.add(PrevalidationCheck(
                            name = "Profesores sin asignaturas",
                            status = "ok",
                            message = "Todos los profesores tienen al menos una asignatura asignada."
                        ))
                    }
                    
                    PrevalidationResult(viable, checks)
                }
                call.respond(result)
            }
        }
    }
}