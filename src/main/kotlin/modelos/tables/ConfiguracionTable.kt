package com.colegio.modelos.tables

import org.jetbrains.exposed.dao.id.IntIdTable


object ConfiguracionTable : IntIdTable("tabla_configuracion") {

    val priorizarTutor = bool("priorizarTutor").default(false)

    // los tiempos están en minutos
    val tiempoMinimo = integer(name = "tiempo_minimo").default(30)
    val tiempoMaximo = integer("tiempo_maximo").default(60)
    val minutosMaximosProfesor = integer("minutos_maximos_profesor").default(1500)
    val priorizarTutorPuntos = integer("priorizar_tutor_puntos").default(100)
    val fomentarBloques60Puntos = integer("fomentar_bloques_60_puntos").default(10)
    val evitarHuecosPuntos = integer("evitar_huecos_puntos").default(50)
    val compactarTempranoPuntos = integer("compactar_temprano_puntos").default(5)

}