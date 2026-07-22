package com.colegio.modelos.tables

import org.jetbrains.exposed.dao.id.IntIdTable
import org.jetbrains.exposed.sql.javatime.time
import java.time.LocalTime

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

    // Configuración dinámica de horas de clase y recreo
    val horaInicioClases = time("hora_inicio_clases").default(LocalTime.of(9, 0))
    val horaFinClases = time("hora_fin_clases").default(LocalTime.of(14, 0))
    val horaInicioRecreo = time("hora_inicio_recreo").default(LocalTime.of(12, 0))
    val duracionRecreo = integer("duracion_recreo").default(30)

    // Configuración de reglas hard
    val respetarEspecialidad = bool("respetar_especialidad").default(true)
    val respetarLimiteHoras = bool("respetar_limite_horas").default(true)
    val respetarDisponibilidad = bool("respetar_disponibilidad").default(true)
}