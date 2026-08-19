package com.colegio.solver

import com.colegio.DTO.Configuracion
import java.time.DayOfWeek
import java.time.LocalTime

object SolverLessonDataLoader {

    /**
     * Calcula la cantidad de bloques o franjas que componen una asignatura según sus minutos semanales y la duración mínima configurada.
     */
    fun calculateBlocksCount(weeklyMinutes: Int, slotDurationMinutes: Int): Int {
        if (weeklyMinutes <= 0 || slotDurationMinutes <= 0) return 0
        return weeklyMinutes / slotDurationMinutes
    }

    /**
     * Genera la lista completa de franjas horarias semanales de lunes a viernes respetando el horario escolar y los intervalos de recreo.
     */
    fun generateTimeSlots(config: Configuracion): List<TimeSlot> {
        val franjas = mutableListOf<TimeSlot>()
        var idFranja = 1
        var indiceGlobal = 0

        val horaInicio = try { LocalTime.parse(config.horaInicioClases) } catch (_: Exception) { LocalTime.of(9, 0) }
        val horaFin = try { LocalTime.parse(config.horaFinClases) } catch (_: Exception) { LocalTime.of(14, 0) }
        val recreoInicio = try { LocalTime.parse(config.horaInicioRecreo) } catch (_: Exception) { LocalTime.of(11, 30) }
        val duracionRecreo = if (config.duracionRecreo > 0) config.duracionRecreo.toLong() else 30L
        val recreoFin = recreoInicio.plusMinutes(duracionRecreo)
        val tiempoMinimo = if (config.tiempoMinimo > 0) config.tiempoMinimo.toLong() else 30L

        for (diaNum in 1..5) {
            val dia = DayOfWeek.of(diaNum)
            var horaActual = horaInicio

            while (horaActual.isBefore(horaFin)) {
                val horaSiguiente = horaActual.plusMinutes(tiempoMinimo)
                val solapaRecreo = horaActual.isBefore(recreoFin) && horaSiguiente.isAfter(recreoInicio)
                if (!solapaRecreo) {
                    franjas.add(
                        TimeSlot(
                            id = "T_${idFranja++}",
                            dayOfWeek = dia,
                            startTime = horaActual,
                            endTime = horaSiguiente,
                            indiceDeFranja = indiceGlobal++,
                            duracionMinutos = tiempoMinimo.toInt()
                        )
                    )
                }
                horaActual = horaSiguiente
            }
        }
        return franjas
    }
}
