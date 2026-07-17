package com.colegio.modelos

import org.jetbrains.exposed.dao.id.IntIdTable


object ConfiguracionTable : IntIdTable("Tabla_Configuracion") {

    val priorizarTutor = bool("priorizarTutor").default(false)
    // los tiempos están en minutos
    val tiempoMinimo = integer(name = "timepo_minimo").default(30)
    val tiempoMaximo= integer("tiempo_maximo").default(60)

}