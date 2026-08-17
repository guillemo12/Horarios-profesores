package com.colegio.modelos.tables

import org.jetbrains.exposed.dao.id.IntIdTable

object ProfesorTable : IntIdTable("profesor") {
    val nombre = varchar("nombre", 100)
    val minutosMaximos = integer("minutos_maximos")
    val color = varchar("color", 7).default("#4f46e5")
    val disponibilidad = text("disponibilidad").default("[]")

    //  val index = index("index_name", isUnique = false, nombre, especialidad)
//    init {
//        foreignKeys(nombre, especialidad, target = this.id)
//    }

}