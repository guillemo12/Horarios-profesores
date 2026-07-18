package com.colegio.modelos.tables

import org.jetbrains.exposed.dao.id.IntIdTable

object AsignaturaTable : IntIdTable("asignatura") {

    val nombre = varchar("nombre", 100)
    val minutos = integer("minutos")
    val curso = reference("curso_id", CursoTable)
    
    init {
        uniqueIndex(nombre, curso)
    }
}