package com.colegio.solver

import java.time.DayOfWeek
import java.time.LocalTime

class TimeSlot(
    val id: String,
    val dayOfWeek: DayOfWeek,
    val startTime: LocalTime,
    val endTime: LocalTime,
    var duracionMinutos: Int = 0,
    var indiceDeFranja: Int = 0
) {
    override fun toString(): String {
        return "$dayOfWeek de $startTime a $endTime"
    }
}