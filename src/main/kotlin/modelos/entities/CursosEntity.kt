package com.colegio.modelos.entities

import com.colegio.modelos.tables.CursoTable
import org.jetbrains.exposed.dao.IntEntity
import org.jetbrains.exposed.dao.IntEntityClass
import org.jetbrains.exposed.dao.id.EntityID

class CursosEntity(id: EntityID<Int>) : IntEntity(id) {
    companion object : IntEntityClass<CursosEntity>(CursoTable)

    var nombre by CursoTable.nombre
}