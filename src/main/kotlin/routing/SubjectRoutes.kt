package com.colegio.routing

import com.colegio.DTO.SubjectDto
import com.colegio.parseId
import com.colegio.modelos.entities.AsignaturaEntity
import com.colegio.modelos.entities.CursosEntity
import com.colegio.modelos.tables.AsignaturaTable
import io.ktor.http.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import org.jetbrains.exposed.sql.SqlExpressionBuilder.eq
import org.jetbrains.exposed.sql.deleteWhere
import org.jetbrains.exposed.sql.transactions.transaction

fun Route.subjectRoutes() {
    route("/subjects") {
        get {
            val list = transaction {
                AsignaturaEntity.all().map {
                    SubjectDto(
                        id = it.id.value.toString(),
                        name = it.nombre,
                        hours = (it.minutos / 60.0),
                        courseId = it.curso.id.value.toString(),
                        teachers = it.profesores.map { p -> p.id.value.toString() }
                    )
                }
            }
            call.respond(list)
        }

        post {
            val dto = call.receive<SubjectDto>()
            val created = transaction {
                val cursoIdInt = parseId(dto.courseId)
                val c = CursosEntity.findById(cursoIdInt)
                    ?: throw IllegalArgumentException("Curso no encontrado")
                val a = AsignaturaEntity.new {
                    this.nombre = dto.name
                    this.minutos = (dto.hours * 60).toInt()
                    this.curso = c
                }
                SubjectDto(a.id.value.toString(), a.nombre, a.minutos / 60.0, c.id.value.toString(), a.profesores.map { p -> p.id.value.toString() })
            }
            call.respond(HttpStatusCode.Created, created)
        }

        put {
            val dto = call.receive<SubjectDto>()
            val updated = transaction {
                val idInt = parseId(dto.id ?: "1")
                val a = AsignaturaEntity.findById(idInt) ?: throw IllegalArgumentException("Asignatura no encontrada")
                a.nombre = dto.name
                a.minutos = (dto.hours * 60).toInt()
                SubjectDto(a.id.value.toString(), a.nombre, a.minutos / 60.0, a.curso.id.value.toString(), a.profesores.map { p -> p.id.value.toString() })
            }
            call.respond(updated)
        }

        delete("/{id}") {
            val idStr = call.parameters["id"] ?: return@delete call.respond(HttpStatusCode.BadRequest)
            transaction {
                val idInt = parseId(idStr)
                AsignaturaTable.deleteWhere { id eq idInt }
            }
            call.respond(HttpStatusCode.OK)
        }
    }
}
