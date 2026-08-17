package com.colegio.modelos.entities

import com.colegio.modelos.tables.ClaseTable
import org.jetbrains.exposed.dao.Entity
import org.jetbrains.exposed.dao.EntityClass
import org.jetbrains.exposed.dao.id.EntityID

class ClaseEntity(id: EntityID<String>) : Entity<String>(id) {
    companion object : EntityClass<String, ClaseEntity>(ClaseTable)

    var start by ClaseTable.start
    var end by ClaseTable.end
    var duration by ClaseTable.duration
    var subject by AsignaturaEntity referencedOn ClaseTable.subjectId
    var group by GruposEntity referencedOn ClaseTable.groupId
    var teacher by ProfesorEntity referencedOn ClaseTable.teacherId
    var isPinned by ClaseTable.isPinned
}
