package com.colegio.modelos.entities

import com.colegio.modelos.GrupoTable
import org.jetbrains.exposed.dao.IntEntity
import org.jetbrains.exposed.dao.IntEntityClass
import org.jetbrains.exposed.dao.id.EntityID

class GrupoEntity(id: EntityID<Int>): IntEntity(id) {
    companion object : IntEntityClass<GrupoEntity>(GrupoTable)

    val curso by GrupoTable.curso
    val letra by GrupoTable.letra

}