package com.colegio.routing

import com.colegio.DTO.Configuracion
import com.colegio.PrevalidationCheck
import com.colegio.PrevalidationResult
import com.colegio.modelos.entities.AsignaturaEntity
import com.colegio.modelos.entities.ConfiguracionEntity
import com.colegio.modelos.entities.GruposEntity
import com.colegio.modelos.entities.ProfesorEntity
import com.colegio.modelos.tables.RepartoDocenteTable
import com.colegio.solver.Leccion
import com.colegio.solver.Prevalidation
import com.colegio.solver.TimeSlot
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import org.jetbrains.exposed.sql.selectAll
import org.jetbrains.exposed.sql.transactions.transaction
import java.time.DayOfWeek
import java.time.LocalTime
import java.util.*

fun Route.prevalidationRoutes() {
    get("/prevalidation") {
        val result = transaction {
            val configEnt = ConfiguracionEntity.all().firstOrNull()
            val config = Configuracion(
                priorizarTutor = configEnt?.priorizarTutor ?: true,
                tiempoMinimo = configEnt?.tiempoMinimo ?: 30,
                tiempoMaximo = configEnt?.tiempoMaximo ?: 60,
                respetarEspecialidad = configEnt?.respetarEspecialidad ?: true,
                respetarLimiteHoras = configEnt?.respetarLimiteHoras ?: true
            )

            val teachers = ProfesorEntity.all().map { it.toProfesor() }

            val lecciones = mutableListOf<Leccion>()
            GruposEntity.all().forEach { g ->
                val grupoObj = g.toGrupo()
                val repartos = RepartoDocenteTable.selectAll().where { RepartoDocenteTable.grupoId eq g.id.value }
                repartos.forEach { row ->
                    val asigEnt = AsignaturaEntity.findById(row[RepartoDocenteTable.asignaturaId].value) ?: return@forEach
                    val profEnt = row[RepartoDocenteTable.profesorId]?.value?.let { ProfesorEntity.findById(it) }

                    val totalMinutes = asigEnt.minutos
                    val minutesPerBlock = config.tiempoMinimo
                    val numBlocks = totalMinutes / minutesPerBlock

                    repeat(numBlocks) {
                        lecciones.add(
                            Leccion(
                                id = UUID.randomUUID().toString(),
                                asignatura = asigEnt.nombre,
                                grupo = grupoObj,
                                minutosSemanales = minutesPerBlock,
                                profesorFijo = profEnt?.toProfesor()
                            )
                        )
                    }
                }
            }

            val timeSlots = mutableListOf<TimeSlot>()
            var slotId = 1
            val days = listOf(DayOfWeek.MONDAY, DayOfWeek.TUESDAY, DayOfWeek.WEDNESDAY, DayOfWeek.THURSDAY, DayOfWeek.FRIDAY)

            val startTimes1 = listOf("09:00", "09:30", "10:00", "10:30", "11:00", "11:30")
            val endTimes1 = listOf("09:30", "10:00", "10:30", "11:00", "11:30", "12:00")

            val startTimes2 = listOf("12:30", "13:00", "13:30", "14:00", "14:30")
            val endTimes2 = listOf("13:00", "13:30", "14:00", "14:30", "15:00")

            for (day in days) {
                for (i in startTimes1.indices) {
                    timeSlots.add(TimeSlot((slotId++).toString(), day, LocalTime.parse(startTimes1[i]), LocalTime.parse(endTimes1[i]), 30))
                }
                for (i in startTimes2.indices) {
                    timeSlots.add(TimeSlot((slotId++).toString(), day, LocalTime.parse(startTimes2[i]), LocalTime.parse(endTimes2[i]), 30))
                }
            }

            val conflictos = Prevalidation.detectarConflictosInviabilidad(lecciones, timeSlots, teachers, config)

            if (conflictos.isEmpty()) {
                PrevalidationResult(
                    viable = true,
                    checks = listOf(
                        PrevalidationCheck("Déficit Profesores", "OK", "Capacidad docente correcta por especialidad"),
                        PrevalidationCheck("Sobrecarga Docente", "OK", "Jornadas docentes dentro del máximo establecido"),
                        PrevalidationCheck("Capacidad Horaria", "OK", "Horario semanal con espacio suficiente")
                    )
                )
            } else {
                PrevalidationResult(
                    viable = false,
                    checks = listOf(
                        PrevalidationCheck("Diagnóstico de Factibilidad", "ERROR", "Se han detectado ${conflictos.size} inestabilidades en la plantilla", conflictos)
                    )
                )
            }
        }

        call.respond(result)
    }
}

fun Route.configRoutes() {
    route("/config") {
        get {
            val dto = transaction {
                val c = ConfiguracionEntity.all().firstOrNull() ?: ConfiguracionEntity.new {
                    priorizarTutor = true
                    tiempoMinimo = 30
                    tiempoMaximo = 60
                    respetarEspecialidad = true
                    respetarLimiteHoras = true
                    limiteTiempoSegundos = 18000.0
                    tiempoEstancamientoSegundos = 60.0
                }
                Configuracion(
                    priorizarTutor = c.priorizarTutor,
                    tiempoMinimo = c.tiempoMinimo,
                    tiempoMaximo = c.tiempoMaximo,
                    minutosMaximosProfesor = c.minutosMaximosProfesor,
                    priorizarTutorPuntos = c.priorizarTutorPuntos,
                    fomentarBloques60Puntos = c.fomentarBloques60Puntos,
                    minimizarAsignaturasDistintas = c.minimizarAsignaturasDistintas,
                    limiteTiempoSegundos = c.limiteTiempoSegundos,
                    tiempoEstancamientoSegundos = c.tiempoEstancamientoSegundos,
                    horaInicioClases = c.horaInicioClases.toString(),
                    horaFinClases = c.horaFinClases.toString(),
                    horaInicioRecreo = c.horaInicioRecreo.toString(),
                    duracionRecreo = c.duracionRecreo,
                    respetarEspecialidad = c.respetarEspecialidad,
                    respetarLimiteHoras = c.respetarLimiteHoras,
                    respetarDisponibilidad = c.respetarDisponibilidad
                )
            }
            call.respond(dto)
        }

        put {
            val dto = call.receive<Configuracion>()
            val updated = transaction {
                val c = ConfiguracionEntity.all().firstOrNull() ?: ConfiguracionEntity.new {
                    priorizarTutor = dto.priorizarTutor
                    tiempoMinimo = dto.tiempoMinimo
                    tiempoMaximo = dto.tiempoMaximo
                    respetarEspecialidad = dto.respetarEspecialidad
                    respetarLimiteHoras = dto.respetarLimiteHoras
                    limiteTiempoSegundos = dto.limiteTiempoSegundos
                    tiempoEstancamientoSegundos = dto.tiempoEstancamientoSegundos
                    minimizarAsignaturasDistintas = dto.minimizarAsignaturasDistintas
                }
                c.priorizarTutor = dto.priorizarTutor
                c.tiempoMinimo = dto.tiempoMinimo
                c.tiempoMaximo = dto.tiempoMaximo
                c.minutosMaximosProfesor = dto.minutosMaximosProfesor
                c.priorizarTutorPuntos = dto.priorizarTutorPuntos
                c.fomentarBloques60Puntos = dto.fomentarBloques60Puntos
                c.minimizarAsignaturasDistintas = dto.minimizarAsignaturasDistintas
                c.limiteTiempoSegundos = dto.limiteTiempoSegundos
                c.tiempoEstancamientoSegundos = dto.tiempoEstancamientoSegundos
                c.respetarEspecialidad = dto.respetarEspecialidad
                c.respetarLimiteHoras = dto.respetarLimiteHoras
                c.respetarDisponibilidad = dto.respetarDisponibilidad

                Configuracion(
                    priorizarTutor = c.priorizarTutor,
                    tiempoMinimo = c.tiempoMinimo,
                    tiempoMaximo = c.tiempoMaximo,
                    minutosMaximosProfesor = c.minutosMaximosProfesor,
                    priorizarTutorPuntos = c.priorizarTutorPuntos,
                    fomentarBloques60Puntos = c.fomentarBloques60Puntos,
                    minimizarAsignaturasDistintas = c.minimizarAsignaturasDistintas,
                    limiteTiempoSegundos = c.limiteTiempoSegundos,
                    tiempoEstancamientoSegundos = c.tiempoEstancamientoSegundos,
                    horaInicioClases = c.horaInicioClases.toString(),
                    horaFinClases = c.horaFinClases.toString(),
                    horaInicioRecreo = c.horaInicioRecreo.toString(),
                    duracionRecreo = c.duracionRecreo,
                    respetarEspecialidad = c.respetarEspecialidad,
                    respetarLimiteHoras = c.respetarLimiteHoras,
                    respetarDisponibilidad = c.respetarDisponibilidad
                )
            }
            call.respond(updated)
        }
    }
}
