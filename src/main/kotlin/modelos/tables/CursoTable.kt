package com.colegio.modelos.tables

import org.jetbrains.exposed.dao.id.IntIdTable

object CursoTable : IntIdTable("curso") {
    val nombre = varchar("nombre", 100).uniqueIndex()
}