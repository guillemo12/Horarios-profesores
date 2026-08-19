package com.colegio.routing

import com.colegio.solver.TimeSlot
import org.slf4j.LoggerFactory
import java.time.DayOfWeek
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.LocalTime
import java.time.format.DateTimeFormatter
import java.time.temporal.TemporalAdjusters

object DateTimeSlotUtils {
    private val logger = LoggerFactory.getLogger("DateTimeSlotUtils")

    fun getIsoDateTime(day: DayOfWeek, time: LocalTime, referenceDate: LocalDate = LocalDate.now()): String {
        val monday = referenceDate.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY))
        val date = monday.plusDays((day.value - 1).toLong())
        val dateTime = LocalDateTime.of(date, time)
        return dateTime.format(DateTimeFormatter.ISO_LOCAL_DATE_TIME)
    }

    fun cleanIsoString(isoStr: String): String {
        val replaced = isoStr.trim().replace(" ", "T")
        return if (replaced.contains("T")) {
            val parts = replaced.split("T")
            val datePart = parts[0]
            val timePart = parts[1].split(".", "+", "Z")[0]
            "${datePart}T${timePart}"
        } else {
            replaced
        }
    }

    fun findTimeSlot(isoStr: String, timeSlots: List<TimeSlot>): TimeSlot? {
        return try {
            val cleanStr = cleanIsoString(isoStr)
            val dt = LocalDateTime.parse(cleanStr)
            val day = dt.dayOfWeek
            val time = dt.toLocalTime()
            timeSlots.find { it.dayOfWeek == day && it.startTime == time }
        } catch (e: Exception) {
            logger.warn("Error parsing ISO date: $isoStr -> ${e.message}")
            null
        }
    }

    fun findTimeSlots(startIso: String, endIso: String, timeSlots: List<TimeSlot>): List<TimeSlot> {
        return try {
            val cleanStart = cleanIsoString(startIso)
            val cleanEnd = cleanIsoString(endIso)
            val startDt = LocalDateTime.parse(cleanStart)
            val endDt = LocalDateTime.parse(cleanEnd)
            val day = startDt.dayOfWeek
            val startTime = startDt.toLocalTime()
            val endTime = endDt.toLocalTime()

            val matched = timeSlots.filter { it.dayOfWeek == day && !it.startTime.isBefore(startTime) && it.endTime.isBefore(endTime.plusSeconds(1)) }
            matched.ifEmpty {
                timeSlots.find { it.dayOfWeek == day && it.startTime == startTime }?.let { listOf(it) } ?: emptyList()
            }
        } catch (e: Exception) {
            logger.warn("Error parsing multi-slot ISO dates: $startIso -> $endIso: ${e.message}")
            emptyList()
        }
    }
}
