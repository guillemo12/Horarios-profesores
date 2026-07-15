package com.colegio.solver

import java.time.DayOfWeek
import java.time.LocalTime


class TimeSlot(
    val id: String,
    val dayOfWeek: DayOfWeek,
    val startTime: LocalTime,
    val endTime: LocalTime
) {
    // Timefold requiere constructores vacíos para inicializar los objetos
    constructor() : this("", DayOfWeek.MONDAY, LocalTime.MIN, LocalTime.MAX)

    // Útil para ver logs limpios en la consola mientras desarrollas
    override fun toString(): String {
        return "$dayOfWeek de $startTime a $endTime"
    }
}