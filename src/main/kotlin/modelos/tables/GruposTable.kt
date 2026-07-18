package com.colegio.modelos.tables

import com.colegio.modelos.ProfesorTable
import org.jetbrains.exposed.dao.id.IntIdTable

object GruposTable : IntIdTable("grupos") {
    val curso = reference("curso_id", CursoTable)
    val nombre = varchar("nombre", 100)
    val tutor = reference("profesor_id", ProfesorTable)
}