package com.colegio.modelos.entities

import com.colegio.modelos.tables.ProfesorAsignaturaTable
import com.colegio.modelos.tables.ProfesorTable
import com.colegio.solver.Profesor
import org.jetbrains.exposed.dao.IntEntity
import org.jetbrains.exposed.dao.IntEntityClass
import org.jetbrains.exposed.dao.id.EntityID

class ProfesorEntity(id: EntityID<Int>) : IntEntity(id) {
    companion object : IntEntityClass<ProfesorEntity>(ProfesorTable)

    var nombre by ProfesorTable.nombre
    var asignaturas by AsignaturaEntity via ProfesorAsignaturaTable
    var minutosMaximos by ProfesorTable.minutosMaximos


    fun toProfesor(): Profesor {
        return Profesor(
            nombre = nombre,
            asignaturas = asignaturas.map { it.nombre },
            asignaturasPreferidas = listOf(),
            minutosMaximos = minutosMaximos // Debería obtenerse desde la tabla de profesores
        )
    }
}