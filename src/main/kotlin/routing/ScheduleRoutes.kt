package com.colegio.routing

import com.colegio.DTO.ScheduledClassDto
import com.colegio.parseId
import com.colegio.modelos.entities.AsignaturaEntity
import com.colegio.modelos.entities.ClaseEntity
import com.colegio.modelos.entities.GruposEntity
import com.colegio.modelos.entities.ProfesorEntity
import com.colegio.modelos.tables.ClaseTable
import io.ktor.http.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import org.jetbrains.exposed.sql.SqlExpressionBuilder.eq
import org.jetbrains.exposed.sql.deleteWhere
import org.jetbrains.exposed.sql.transactions.transaction

fun Route.scheduleRoutes() {
    route("/scheduledClasses") {
        get {
            val list = transaction {
                ClaseEntity.all().map { c ->
                    ScheduledClassDto(
                        id = c.id.value,
                        start = c.start,
                        end = c.end,
                        duration = c.duration,
                        subjectId = c.subject.id.value.toString(),
                        groupId = c.group.id.value.toString(),
                        teacherId = c.teacher.id.value.toString(),
                        isPinned = c.isPinned
                    )
                }
            }
            call.respond(list)
        }

        post {
            val dto = call.receive<ScheduledClassDto>()
            val created = transaction {
                val sub = AsignaturaEntity.findById(parseId(dto.subjectId)) ?: throw IllegalArgumentException("Subject not found")
                val grp = GruposEntity.findById(parseId(dto.groupId)) ?: throw IllegalArgumentException("Group not found")
                val tchr = ProfesorEntity.findById(parseId(dto.teacherId)) ?: throw IllegalArgumentException("Teacher not found")

                val c = ClaseEntity.new(dto.id) {
                    start = dto.start
                    end = dto.end
                    duration = dto.duration
                    subject = sub
                    group = grp
                    teacher = tchr
                    isPinned = dto.isPinned
                }

                ScheduledClassDto(
                    id = c.id.value,
                    start = c.start,
                    end = c.end,
                    duration = c.duration,
                    subjectId = c.subject.id.value.toString(),
                    groupId = c.group.id.value.toString(),
                    teacherId = c.teacher.id.value.toString(),
                    isPinned = c.isPinned
                )
            }
            call.respond(HttpStatusCode.Created, created)
        }

        put {
            val dto = call.receive<ScheduledClassDto>()
            val updated = transaction {
                val cId = dto.id ?: throw IllegalArgumentException("Id de clase requerido")
                val c = ClaseEntity.findById(cId) ?: throw IllegalArgumentException("Clase no encontrada: $cId")
                val sub = AsignaturaEntity.findById(parseId(dto.subjectId)) ?: throw IllegalArgumentException("Subject not found")
                val grp = GruposEntity.findById(parseId(dto.groupId)) ?: throw IllegalArgumentException("Group not found")
                val tchr = ProfesorEntity.findById(parseId(dto.teacherId)) ?: throw IllegalArgumentException("Teacher not found")

                c.start = dto.start
                c.end = dto.end
                c.duration = dto.duration
                c.subject = sub
                c.group = grp
                c.teacher = tchr
                c.isPinned = dto.isPinned

                ScheduledClassDto(
                    id = c.id.value,
                    start = c.start,
                    end = c.end,
                    duration = c.duration,
                    subjectId = c.subject.id.value.toString(),
                    groupId = c.group.id.value.toString(),
                    teacherId = c.teacher.id.value.toString(),
                    isPinned = c.isPinned
                )
            }
            call.respond(updated)
        }

        delete("/{id}") {
            val idStr = call.parameters["id"] ?: return@delete call.respond(HttpStatusCode.BadRequest)
            transaction {
                ClaseTable.deleteWhere { id eq idStr }
            }
            call.respond(HttpStatusCode.OK)
        }

        delete("/group/{groupId}") {
            val groupIdStr = call.parameters["groupId"] ?: return@delete call.respond(HttpStatusCode.BadRequest)
            transaction {
                val gIdInt = parseId(groupIdStr)
                ClaseTable.deleteWhere { groupId eq gIdInt }
            }
            call.respond(HttpStatusCode.OK)
        }
    }
}
