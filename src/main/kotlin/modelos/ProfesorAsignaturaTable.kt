package com.colegio.modelos

import org.jetbrains.exposed.sql.Table

object ProfesorAsignaturaTable : Table("profesor_asignatura") {
    val profesorId = reference("profesor_id", ProfesoresTable)
    val asignaturaId = reference("asignatura_id", AsignaturaTable)
    override val primaryKey = PrimaryKey(profesorId, asignaturaId)
}