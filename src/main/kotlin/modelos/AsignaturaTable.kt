package com.colegio.modelos

import org.jetbrains.exposed.dao.id.IntIdTable

object AsignaturaTable : IntIdTable("asignatura") {
    val nombre = varchar("nombre", 100)
    val minutos = integer("minutos")
    val curso = varchar("curso", 100)
}