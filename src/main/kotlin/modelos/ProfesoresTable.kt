package com.colegio.modelos

import org.jetbrains.exposed.dao.id.IntIdTable
import org.jetbrains.exposed.sql.SchemaUtils
import org.jetbrains.exposed.sql.Table.Dual.foreignKeys
import org.jetbrains.exposed.sql.transactions.transaction

object ProfesoresTable : IntIdTable("profesor") {
    val nombre = varchar("nombre", 100)
    val especialidad = varchar("especialidad", 100)
  //  val index = index("index_name", isUnique = false, nombre, especialidad)
//    init {
//        foreignKeys(nombre, especialidad, target = this.id)
//    }

}