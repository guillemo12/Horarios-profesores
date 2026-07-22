package com.colegio.modelos.tables

import org.jetbrains.exposed.dao.id.IdTable
import org.jetbrains.exposed.sql.ReferenceOption

object ClaseTable : IdTable<String>("clase_programada") {
    override val id = varchar("id", 100).entityId()
    val start = varchar("start_time", 100)
    val end = varchar("end_time", 100)
    val duration = double("duration")
    val subjectId = reference("subject_id", AsignaturaTable, onDelete = ReferenceOption.CASCADE)
    val groupId = reference("group_id", GruposTable, onDelete = ReferenceOption.CASCADE)
    val teacherId = reference("teacher_id", ProfesorTable, onDelete = ReferenceOption.CASCADE)
    val isPinned = bool("is_pinned")
}
