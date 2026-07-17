package com.colegio.modelos

import org.jetbrains.exposed.dao.id.IntIdTable

object ProfesorTable : IntIdTable("profesor") {
    val nombre = varchar("nombre", 100)

  //  val index = index("index_name", isUnique = false, nombre, especialidad)
//    init {
//        foreignKeys(nombre, especialidad, target = this.id)
//    }

}