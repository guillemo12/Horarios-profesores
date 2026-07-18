package com.colegio.modelos.entities

import com.colegio.modelos.ProfesorAsignaturaTable
import com.colegio.modelos.ProfesorTable
import com.colegio.solver.Profesor
import org.jetbrains.exposed.dao.IntEntity
import org.jetbrains.exposed.dao.IntEntityClass
import org.jetbrains.exposed.dao.id.EntityID

class ProfesorEntity(id: EntityID<Int>) : IntEntity(id) {
    companion object : IntEntityClass<ProfesorEntity>(ProfesorTable)

    var nombre by ProfesorTable.nombre

    var asignaturas by AsignaturaEntity via ProfesorAsignaturaTable


    fun toProfesor(): Profesor {
        return Profesor(
            nombre = nombre,
            asignaturas = asignaturas.map { it.nombre },
            asignaturasPreferidas = listOf()
        )
    }
}