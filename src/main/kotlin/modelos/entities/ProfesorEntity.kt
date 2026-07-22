package com.colegio.modelos.entities

import com.colegio.modelos.tables.ProfesorAsignaturaTable
import com.colegio.modelos.tables.ProfesorTable
import com.colegio.solver.Profesor
import com.colegio.DTO.TeacherAvailabilityDto
import kotlinx.serialization.json.Json
import org.jetbrains.exposed.dao.IntEntity
import org.jetbrains.exposed.dao.IntEntityClass
import org.jetbrains.exposed.dao.id.EntityID

class ProfesorEntity(id: EntityID<Int>) : IntEntity(id) {
    companion object : IntEntityClass<ProfesorEntity>(ProfesorTable)

    var nombre by ProfesorTable.nombre
    var asignaturas by AsignaturaEntity via ProfesorAsignaturaTable
    var minutosMaximos by ProfesorTable.minutosMaximos
    var color by ProfesorTable.color
    var disponibilidad by ProfesorTable.disponibilidad

    fun toProfesor(): Profesor {
        val list = try {
            Json.decodeFromString<List<TeacherAvailabilityDto>>(disponibilidad)
        } catch (e: Exception) {
            emptyList()
        }
        return Profesor(
            nombre = nombre,
            asignaturas = asignaturas.map { it.nombre },
            asignaturasPreferidas = listOf(),
            minutosMaximos = minutosMaximos,
            availability = list
        )
    }
}