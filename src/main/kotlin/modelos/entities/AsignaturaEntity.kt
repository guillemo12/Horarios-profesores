package com.colegio.modelos.entities

import com.colegio.modelos.AsignaturaTable
import com.colegio.modelos.ProfesorAsignaturaTable
import org.jetbrains.exposed.dao.IntEntity
import org.jetbrains.exposed.dao.IntEntityClass
import org.jetbrains.exposed.dao.id.EntityID

class AsignaturaEntity(id: EntityID<Int>) : IntEntity(id) {
    companion object : IntEntityClass<AsignaturaEntity>(AsignaturaTable)

    var nombre by AsignaturaTable.nombre
    var minutos by AsignaturaTable.minutos

    // CORRECCIÓN AQUÍ: Le decimos a Exposed que esta propiedad maneja
    // un objeto CursosEntity basándose en la columna de la clave foránea
    var curso by CursosEntity referencedOn AsignaturaTable.curso

    var profesores by ProfesorEntity via ProfesorAsignaturaTable
}