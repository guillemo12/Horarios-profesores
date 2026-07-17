package com.colegio.modelos

import org.jetbrains.exposed.dao.id.IntIdTable

object GrupoTable : IntIdTable("grupo") {
    val curso = varchar("curso", 50) // Ej: "1º"
    val letra = varchar("letra", 10) // Ej: "A", "B", "C"
}