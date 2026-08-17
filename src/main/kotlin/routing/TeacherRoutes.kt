package com.colegio.routing

import com.colegio.DTO.TeacherAvailabilityDto
import com.colegio.DTO.TeacherDto
import com.colegio.parseId
import com.colegio.modelos.entities.AsignaturaEntity
import com.colegio.modelos.entities.ProfesorEntity
import com.colegio.modelos.tables.ProfesorAsignaturaTable
import com.colegio.modelos.tables.ProfesorTable
import io.ktor.http.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import org.jetbrains.exposed.dao.id.EntityID
import org.jetbrains.exposed.sql.SizedCollection
import org.jetbrains.exposed.sql.SqlExpressionBuilder.eq
import org.jetbrains.exposed.sql.deleteWhere
import org.jetbrains.exposed.sql.transactions.transaction

fun Route.teacherRoutes() {
    route("/teachers") {
        get {
            val list = transaction {
                ProfesorEntity.all().map { p ->
                    val avail = try {
                        Json.decodeFromString<List<TeacherAvailabilityDto>>(p.disponibilidad)
                    } catch (_: Exception) {
                        emptyList()
                    }
                    TeacherDto(
                        id = p.id.value.toString(),
                        name = p.nombre,
                        maxHours = (p.minutosMaximos / 60.0),
                        color = p.color,
                        subjects = p.asignaturas.map { it.id.value.toString() },
                        availability = avail
                    )
                }
            }
            call.respond(list)
        }

        post {
            val dto = call.receive<TeacherDto>()
            val created = transaction {
                val p = ProfesorEntity.new {
                    nombre = dto.name
                    color = dto.color
                    minutosMaximos = (dto.maxHours * 60).toInt()
                    disponibilidad = Json.encodeToString(dto.availability)
                }

                val asigList = dto.subjects.mapNotNull { sid ->
                    AsignaturaEntity.findById(parseId(sid))
                }
                p.asignaturas = SizedCollection(asigList)

                val avail = try {
                    Json.decodeFromString<List<TeacherAvailabilityDto>>(p.disponibilidad)
                } catch (_: Exception) {
                    emptyList()
                }

                TeacherDto(
                    id = p.id.value.toString(),
                    name = p.nombre,
                    maxHours = p.minutosMaximos / 60.0,
                    color = p.color,
                    subjects = p.asignaturas.map { it.id.value.toString() },
                    availability = avail
                )
            }
            call.respond(HttpStatusCode.Created, created)
        }

        put {
            val dto = call.receive<TeacherDto>()
            val updated = transaction {
                val pId = parseId(dto.id ?: "1")
                val p = ProfesorEntity.findById(pId) ?: throw IllegalArgumentException("Profesor no encontrado")

                p.nombre = dto.name
                p.color = dto.color
                p.minutosMaximos = (dto.maxHours * 60).toInt()
                p.disponibilidad = Json.encodeToString(dto.availability)

                val asigList = dto.subjects.mapNotNull { sid ->
                    AsignaturaEntity.findById(parseId(sid))
                }
                p.asignaturas = SizedCollection(asigList)

                val avail = try {
                    Json.decodeFromString<List<TeacherAvailabilityDto>>(p.disponibilidad)
                } catch (_: Exception) {
                    emptyList()
                }

                TeacherDto(
                    id = p.id.value.toString(),
                    name = p.nombre,
                    maxHours = p.minutosMaximos / 60.0,
                    color = p.color,
                    subjects = p.asignaturas.map { it.id.value.toString() },
                    availability = avail
                )
            }
            call.respond(updated)
        }

        delete("/{id}") {
            val idStr = call.parameters["id"] ?: return@delete call.respond(HttpStatusCode.BadRequest)
            transaction {
                val pId = parseId(idStr)
                ProfesorAsignaturaTable.deleteWhere { profesorId eq EntityID(pId, ProfesorTable) }
                ProfesorTable.deleteWhere { id eq pId }
            }
            call.respond(HttpStatusCode.OK)
        }
    }
}
