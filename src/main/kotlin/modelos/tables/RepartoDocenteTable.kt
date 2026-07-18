package com.colegio.modelos.tables

import org.jetbrains.exposed.dao.id.IntIdTable
import org.jetbrains.exposed.sql.ReferenceOption

object RepartoDocenteTable : IntIdTable("reparto_docente") {
    val profesorId = reference("profesor_id", ProfesorTable, onDelete = ReferenceOption.CASCADE)
    val asignaturaId = reference("asignatura_id", AsignaturaTable, onDelete = ReferenceOption.CASCADE)
    val grupoId = reference("grupo_id", GruposTable, onDelete = ReferenceOption.CASCADE)
}