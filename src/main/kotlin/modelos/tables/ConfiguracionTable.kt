package com.colegio.modelos.tables

import org.jetbrains.exposed.dao.id.IntIdTable


object ConfiguracionTable : IntIdTable("tabla_configuracion") {

    val priorizarTutor = bool("priorizarTutor").default(false)

    // los tiempos están en minutos
    val tiempoMinimo = integer(name = "tiempo_minimo").default(30)
    val tiempoMaximo = integer("tiempo_maximo").default(60)

}