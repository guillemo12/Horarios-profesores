package com.colegio.routing

import com.colegio.DTO.CourseDto
import com.colegio.DTO.CourseGroupDto
import com.colegio.parseId
import com.colegio.modelos.entities.AsignaturaEntity
import com.colegio.modelos.entities.CursosEntity
import com.colegio.modelos.entities.GruposEntity
import com.colegio.modelos.entities.ProfesorEntity
import com.colegio.modelos.tables.AsignaturaTable
import com.colegio.modelos.tables.ClaseTable
import com.colegio.modelos.tables.CursoTable
import com.colegio.modelos.tables.GruposTable
import com.colegio.modelos.tables.RepartoDocenteTable
import io.ktor.http.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import org.jetbrains.exposed.sql.SqlExpressionBuilder.eq
import org.jetbrains.exposed.sql.deleteWhere
import org.jetbrains.exposed.sql.selectAll
import org.jetbrains.exposed.sql.transactions.transaction

fun Route.courseRoutes() {
    route("/courses") {
        get {
            val list = transaction {
                CursosEntity.all().map { c ->
                    val subjectsList = AsignaturaEntity.find { AsignaturaTable.curso eq c.id }.map { it.id.value.toString() }
                    val groupsList = GruposEntity.find { GruposTable.curso eq c.id }.map { g ->
                        val repartos = RepartoDocenteTable.selectAll().where { RepartoDocenteTable.grupoId eq g.id.value }
                        val assignmentsMap = mutableMapOf<String, String>()
                        repartos.forEach { row ->
                            val subId = row[RepartoDocenteTable.asignaturaId].value.toString()
                            val profId = row[RepartoDocenteTable.profesorId]?.value?.toString() ?: ""
                            if (profId.isNotEmpty()) assignmentsMap[subId] = profId
                        }
                        CourseGroupDto(
                            id = g.id.value.toString(),
                            name = g.nombre,
                            tutorId = g.tutor.id.value.toString(),
                            assignments = assignmentsMap
                        )
                    }
                    CourseDto(
                        id = c.id.value.toString(),
                        name = c.nombre,
                        subjects = subjectsList,
                        groups = groupsList
                    )
                }
            }
            call.respond(list)
        }

        post {
            val dto = call.receive<CourseDto>()
            val created = transaction {
                val c = CursosEntity.new { nombre = dto.name }
                val defaultProf = ProfesorEntity.all().firstOrNull()
                dto.groups.forEach { gDto ->
                    val tutorEnt = gDto.tutorId.let { tid -> ProfesorEntity.findById(parseId(tid)) } ?: defaultProf
                    if (tutorEnt != null) {
                        GruposEntity.new {
                            nombre = gDto.name
                            curso = c
                            tutor = tutorEnt
                        }
                    }
                }
                val subjectsList = AsignaturaEntity.find { AsignaturaTable.curso eq c.id }.map { it.id.value.toString() }
                val groupsList = GruposEntity.find { GruposTable.curso eq c.id }.map { g ->
                    CourseGroupDto(g.id.value.toString(), g.nombre, g.tutor.id.value.toString(), emptyMap())
                }
                CourseDto(
                    id = c.id.value.toString(),
                    name = c.nombre,
                    subjects = subjectsList,
                    groups = groupsList
                )
            }
            call.respond(HttpStatusCode.Created, created)
        }

        put {
            val dto = call.receive<CourseDto>()
            val updated = transaction {
                val cId = parseId(dto.id ?: "1")
                val c = CursosEntity.findById(cId) ?: throw IllegalArgumentException("Curso no encontrado")
                c.nombre = dto.name
                val subjectsList = AsignaturaEntity.find { AsignaturaTable.curso eq c.id }.map { it.id.value.toString() }
                val groupsList = GruposEntity.find { GruposTable.curso eq c.id }.map { g ->
                    CourseGroupDto(g.id.value.toString(), g.nombre, g.tutor.id.value.toString(), emptyMap())
                }
                CourseDto(
                    id = c.id.value.toString(),
                    name = c.nombre,
                    subjects = subjectsList,
                    groups = groupsList
                )
            }
            call.respond(updated)
        }

        put("/{id}/groups") {
            val courseIdStr = call.parameters["id"] ?: return@put call.respond(HttpStatusCode.BadRequest)
            val groupsDto = call.receive<List<CourseGroupDto>>()

            val updated = transaction {
                val cId = parseId(courseIdStr)
                val c = CursosEntity.findById(cId) ?: throw IllegalArgumentException("Curso no encontrado")

                val existingGroups = GruposEntity.find { GruposTable.curso eq c.id }.toList()
                val existingGroupIds = existingGroups.map { it.id.value }.toSet()
                val incomingGroupIds = groupsDto.map { parseId(it.id ?: "0") }.toSet()

                val toDelete = existingGroupIds - incomingGroupIds
                toDelete.forEach { gId ->
                    RepartoDocenteTable.deleteWhere { grupoId eq gId }
                    ClaseTable.deleteWhere { groupId eq gId }
                    GruposTable.deleteWhere { id eq gId }
                }

                val defaultProf = ProfesorEntity.all().firstOrNull()
                groupsDto.forEach { gDto ->
                    val tutorEnt = ProfesorEntity.findById(parseId(gDto.tutorId)) ?: defaultProf
                    val gId = parseId(gDto.id ?: "0")
                    val existing = GruposEntity.findById(gId)
                    if (existing != null) {
                        existing.nombre = gDto.name
                        if (tutorEnt != null) existing.tutor = tutorEnt
                    } else {
                        if (tutorEnt != null) {
                            GruposEntity.new {
                                nombre = gDto.name
                                curso = c
                                tutor = tutorEnt
                            }
                        }
                    }
                }

                val subjectsList = AsignaturaEntity.find { AsignaturaTable.curso eq c.id }.map { it.id.value.toString() }
                val groupsList = GruposEntity.find { GruposTable.curso eq c.id }.map { g ->
                    CourseGroupDto(g.id.value.toString(), g.nombre, g.tutor.id.value.toString(), emptyMap())
                }

                CourseDto(
                    id = c.id.value.toString(),
                    name = c.nombre,
                    subjects = subjectsList,
                    groups = groupsList
                )
            }
            call.respond(updated)
        }

        delete("/{id}") {
            val idStr = call.parameters["id"] ?: return@delete call.respond(HttpStatusCode.BadRequest)
            transaction {
                val cId = parseId(idStr)
                val groups = GruposEntity.find { GruposTable.curso eq cId }.toList()
                groups.forEach { g ->
                    RepartoDocenteTable.deleteWhere { grupoId eq g.id.value }
                    ClaseTable.deleteWhere { groupId eq g.id.value }
                    GruposTable.deleteWhere { id eq g.id.value }
                }
                CursoTable.deleteWhere { id eq cId }
            }
            call.respond(HttpStatusCode.OK)
        }
    }
}
