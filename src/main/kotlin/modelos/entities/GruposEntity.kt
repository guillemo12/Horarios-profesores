package com.colegio.modelos.entities

import com.colegio.modelos.tables.GruposTable
import com.colegio.solver.Grupo
import org.jetbrains.exposed.dao.IntEntity
import org.jetbrains.exposed.dao.IntEntityClass
import org.jetbrains.exposed.dao.id.EntityID

class GruposEntity(id: EntityID<Int>) : IntEntity(id) {
    companion object : IntEntityClass<GruposEntity>(GruposTable)

    var nombre by GruposTable.nombre
    var curso by CursosEntity referencedOn GruposTable.curso
    var tutor by ProfesorEntity referencedOn GruposTable.tutor

    fun toGrupo(): Grupo {

        return Grupo(
            nombre = nombre,
            curso = curso.nombre,
            tutor = tutor.toProfesor()
        )
    }

}