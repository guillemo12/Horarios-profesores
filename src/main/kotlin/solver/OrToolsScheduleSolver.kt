package com.colegio.solver

import com.colegio.DTO.Configuracion
import com.google.ortools.Loader
import com.google.ortools.sat.*
import org.slf4j.LoggerFactory
import java.time.DayOfWeek
import java.util.concurrent.atomic.AtomicBoolean
import java.util.concurrent.atomic.AtomicInteger
import java.util.concurrent.atomic.AtomicLong
import java.util.concurrent.atomic.AtomicReference

data class SolverProgress(
    val status: CpSolverStatus,
    val isFeasible: Boolean,
    val hardScore: Int,
    val softScore: Int,
    val bestBound: Long = 0L,
    val rawObjective: Long = 0L,
    val conflictos: List<String>,
    val solvedLessons: List<Leccion>,
    val stoppedByStagnation: Boolean = false
)

data class UnitKey(val grupoCurso: String, val grupoNombre: String, val asignatura: String)

object OrToolsScheduleSolver {
    private val logger = LoggerFactory.getLogger("OrToolsScheduleSolver")

    init {
        try {
            Loader.loadNativeLibraries()
            logger.info("Google OR-Tools native libraries cargadas correctamente.")
        } catch (e: Throwable) {
            logger.error("Error al cargar las librerías nativas de Google OR-Tools: ${e.message}", e)
        }
    }

    private fun franjaBloqueadaPorProfesor(slot: TimeSlot, bloqueos: List<com.colegio.DTO.TeacherAvailabilityDto>): Boolean {
        for (b in bloqueos) {
            if (b.dayOfWeek != slot.dayOfWeek.value) continue
            if (slot.startTime.toString() >= b.startTime && slot.endTime.toString() <= b.endTime) {
                return true
            }
        }
        return false
    }

    fun solve(
        timeSlots: List<TimeSlot>,
        lessons: List<Leccion>,
        teachers: List<Profesor>,
        config: Configuracion,
        timeLimitSeconds: Double = 18000.0,
        onProgress: ((SolverProgress) -> Unit)? = null,
        isStopped: (() -> Boolean)? = null
    ): SolverProgress {
        val startTimeMs = System.currentTimeMillis()
        val numLessons = lessons.size
        val numSlots = timeSlots.size
        val numTeachers = teachers.size

        if (numLessons == 0 || numSlots == 0 || numTeachers == 0) {
            return SolverProgress(
                status = CpSolverStatus.MODEL_INVALID,
                isFeasible = false,
                hardScore = -1,
                softScore = 0,
                conflictos = listOf("Sin datos suficientes para resolver (lecciones, franjas o profesores vacíos)."),
                solvedLessons = lessons
            )
        }

        // Prevalidación básica de factibilidad
        val preValidationConflicts = Prevalidation.detectarConflictosInviabilidad(lessons, timeSlots, teachers, config)
        if (preValidationConflicts.isNotEmpty()) {
            logger.warn("Inviabilidad detectada en prevalidación (${preValidationConflicts.size} conflictos):")
            preValidationConflicts.forEach { logger.warn("   ❌ $it") }
        }

        val effectiveTimeLimit = if (config.limiteTiempoSegundos > 0) minOf(timeLimitSeconds, config.limiteTiempoSegundos) else timeLimitSeconds
        val stagnationSeconds = config.tiempoEstancamientoSegundos

        // -------------------------------------------------------------------------
        // 1. MODELADO AGREGADO POR UNIDAD (GRUPO, ASIGNATURA) - ARQUITECTURA PYTHON
        // -------------------------------------------------------------------------

        val unitsMap = mutableMapOf<UnitKey, MutableList<Leccion>>()
        for (l in lessons) {
            val key = UnitKey(l.grupo.curso, l.grupo.nombre, l.asignatura)
            unitsMap.getOrPut(key) { mutableListOf() }.add(l)
        }

        val teacherIndexMap = teachers.withIndex().associate { it.value.nombre to it.index }
        val slotIndexMap = timeSlots.withIndex().associate { it.value.id to it.index }

        val groupNames = lessons.map { "${it.grupo.curso} ${it.grupo.nombre}" }.distinct()
        val groupIndexMap = groupNames.withIndex().associate { it.value to it.index }
        val numGroups = groupNames.size

        val model = CpModel()

        val yVars = mutableMapOf<Triple<UnitKey, Int, Int>, BoolVar>() // (unitKey, tIdx, pIdx) -> BoolVar
        val zVars = mutableMapOf<Pair<UnitKey, Int>, BoolVar>()          // (unitKey, tIdx) -> BoolVar
        val usaVars = mutableMapOf<Pair<UnitKey, Int>, BoolVar>()        // (unitKey, pIdx) -> BoolVar
        val validSlotsPerUnit = mutableMapOf<UnitKey, MutableList<Int>>()

        val varsByTeacherSlot = List(numTeachers) { List(numSlots) { mutableListOf<BoolVar>() } }
        val varsByGroupSlot = List(numGroups) { List(numSlots) { mutableListOf<BoolVar>() } }
        val varsByTeacher = List(numTeachers) { mutableListOf<Pair<TimeSlot, BoolVar>>() }
        val varsByUnitDay = mutableMapOf<Pair<UnitKey, DayOfWeek>, MutableList<Pair<Int, BoolVar>>>()

        for ((uKey, uLessons) in unitsMap) {
            val sample = uLessons.first()
            val gName = "${sample.grupo.curso} ${sample.grupo.nombre}"
            val gIdx = groupIndexMap[gName] ?: continue

            val eligibleTeachers = teachers.filter { t ->
                if (sample.profesorFijo != null) {
                    t.nombre == sample.profesorFijo.nombre
                } else {
                    Prevalidation.isTeacherQualified(t, sample.asignatura, config)
                }
            }

            val multiTeacher = eligibleTeachers.size > 1
            if (multiTeacher) {
                for (t in eligibleTeachers) {
                    val pIdx = teacherIndexMap[t.nombre] ?: continue
                    val uvar = model.newBoolVar("usa_${uKey.grupoCurso}_${uKey.grupoNombre}_${uKey.asignatura}_$pIdx")
                    usaVars[Pair(uKey, pIdx)] = uvar
                }
                // Un solo profesor asignado por unidad
                model.addAtMostOne(eligibleTeachers.mapNotNull { t -> teacherIndexMap[t.nombre]?.let { usaVars[Pair(uKey, it)] } }.toTypedArray())
            }

            val validSlots = mutableListOf<Int>()
            for (slot in timeSlots) {
                val tIdx = slotIndexMap[slot.id] ?: continue
                val yInSlot = mutableListOf<BoolVar>()

                for (t in eligibleTeachers) {
                    val pIdx = teacherIndexMap[t.nombre] ?: continue

                    if (config.respetarDisponibilidad && t.availability.isNotEmpty()) {
                        if (franjaBloqueadaPorProfesor(slot, t.availability)) continue
                    }

                    val varName = "y_${uKey.grupoCurso}_${uKey.grupoNombre}_${uKey.asignatura}_${tIdx}_$pIdx"
                    val boolVar = model.newBoolVar(varName)

                    yVars[Triple(uKey, tIdx, pIdx)] = boolVar
                    yInSlot.add(boolVar)

                    varsByTeacherSlot[pIdx][tIdx].add(boolVar)
                    varsByGroupSlot[gIdx][tIdx].add(boolVar)
                    varsByTeacher[pIdx].add(Pair(slot, boolVar))

                    if (multiTeacher) {
                        val uvar = usaVars[Pair(uKey, pIdx)]
                        if (uvar != null) {
                            model.addImplication(boolVar, uvar)
                        }
                    }
                }

                if (yInSlot.isNotEmpty()) {
                    val zvar = model.newBoolVar("z_${uKey.grupoCurso}_${uKey.grupoNombre}_${uKey.asignatura}_$tIdx")
                    model.addEquality(zvar, LinearExpr.sum(yInSlot.toTypedArray()))
                    zVars[Pair(uKey, tIdx)] = zvar
                    validSlots.add(tIdx)

                    val unitDayKey = Pair(uKey, slot.dayOfWeek)
                    varsByUnitDay.getOrPut(unitDayKey) { mutableListOf() }.add(Pair(tIdx, zvar))
                }
            }
            validSlotsPerUnit[uKey] = validSlots
        }

        // REGLA 1 (PYTHON R1): Cada unidad se coloca como máximo N_bloques veces
        for ((uKey, uLessons) in unitsMap) {
            val validSlots = validSlotsPerUnit[uKey] ?: continue
            val zs = validSlots.mapNotNull { tIdx -> zVars[Pair(uKey, tIdx)] }
            if (zs.isNotEmpty()) {
                model.addLessOrEqual(LinearExpr.sum(zs.toTypedArray()), uLessons.size.toLong())
            }
        }

        // FIJAR CLASES PINNED: Si una lección tiene isPinned == true, forzar su posición en el solver
        for ((uKey, uLessons) in unitsMap) {
            for (pinned in uLessons.filter { it.isPinned && it.timeSlot != null }) {
                val tSlot = pinned.timeSlot!!
                val tIdx = timeSlots.indexOfFirst { it.dayOfWeek == tSlot.dayOfWeek && it.startTime == tSlot.startTime }
                if (tIdx >= 0) {
                    val zvar = zVars[Pair(uKey, tIdx)]
                    if (zvar != null) {
                        model.addEquality(zvar, 1)
                    }
                    if (pinned.profesor != null) {
                        val pIdx = teacherIndexMap[pinned.profesor!!.nombre]
                        if (pIdx != null) {
                            val yvar = yVars[Triple(uKey, tIdx, pIdx)]
                            if (yvar != null) {
                                model.addEquality(yvar, 1)
                            }
                        }
                    }
                }
            }
        }

        // REGLA 2 (PYTHON R2): Un profesor no puede dar más de 1 clase a la vez
        for (pIdx in 0 until numTeachers) {
            for (tIdx in 0 until numSlots) {
                val tsVars = varsByTeacherSlot[pIdx][tIdx]
                if (tsVars.size > 1) {
                    model.addAtMostOne(tsVars.toTypedArray())
                }
            }
        }

        // REGLA 3 (PYTHON R3): Un grupo no puede recibir más de 1 clase a la vez
        for (gIdx in 0 until numGroups) {
            for (tIdx in 0 until numSlots) {
                val gsVars = varsByGroupSlot[gIdx][tIdx]
                if (gsVars.size > 1) {
                    model.addAtMostOne(gsVars.toTypedArray())
                }
            }
        }

        // REGLA 4 (PYTHON R4): Límite de minutos por profesor
        if (config.respetarLimiteHoras) {
            for (pIdx in 0 until numTeachers) {
                val pVars = varsByTeacher[pIdx]
                if (pVars.isNotEmpty()) {
                    val xVars = pVars.map { it.second }.toTypedArray()
                    val durations = pVars.map { it.first.duracionMinutos.toLong() }.toLongArray()
                    val maxMin = teachers[pIdx].minutosMaximos.toLong()
                    model.addLessOrEqual(LinearExpr.weightedSum(xVars, durations), maxMin)
                }
            }
        }

        // Mapeo de slots fijados (pinned) por unidad
        val pinnedSlotsPerUnit = mutableMapOf<UnitKey, MutableSet<Int>>()
        for ((uKey, uLessons) in unitsMap) {
            val pSlots = mutableSetOf<Int>()
            for (pinned in uLessons.filter { it.isPinned && it.timeSlot != null }) {
                val tSlot = pinned.timeSlot!!
                val tIdx = timeSlots.indexOfFirst { it.dayOfWeek == tSlot.dayOfWeek && it.startTime == tSlot.startTime }
                if (tIdx >= 0) {
                    pSlots.add(tIdx)
                }
            }
            if (pSlots.isNotEmpty()) {
                pinnedSlotsPerUnit[uKey] = pSlots
            }
        }

        // REGLA 7 (PYTHON R7): Máximo 3 bloques/día por unidad (<= 1h30), salvo bloques fijados manualmente
        for ((uKey, _) in unitsMap) {
            val pinnedUnitSlots = pinnedSlotsPerUnit[uKey] ?: emptySet()
            for (day in DayOfWeek.values().filter { it.value in 1..5 }) {
                val unitDayList = varsByUnitDay[Pair(uKey, day)] ?: continue
                val pinnedCountOnDay = unitDayList.count { it.first in pinnedUnitSlots }
                val maxAllowed = maxOf(3, pinnedCountOnDay)
                if (unitDayList.size > maxAllowed) {
                    val zs = unitDayList.map { it.second }
                    model.addLessOrEqual(LinearExpr.sum(zs.toTypedArray()), maxAllowed.toLong())
                }
            }
        }

        // REGLA 8 (PYTHON R8): NUNCA 3 BLOQUES CONSECUTIVOS EN EL TIEMPO PARA LA MISMA MATERIA
        // (Separa la clase suelta de 30 min del par de 60 min, salvo bloques fijados manualmente)
        val days = DayOfWeek.values().filter { it.value in 1..5 }
        for (day in days) {
            val daySlots = timeSlots.withIndex().filter { it.value.dayOfWeek == day }.sortedBy { it.value.indiceDeFranja }
            for (i in 0 until daySlots.size - 2) {
                val s1 = daySlots[i]
                val s2 = daySlots[i + 1]
                val s3 = daySlots[i + 2]
                if (s2.value.indiceDeFranja == s1.value.indiceDeFranja + 1 &&
                    s3.value.indiceDeFranja == s2.value.indiceDeFranja + 1) {

                    for ((uKey, _) in unitsMap) {
                        val pinnedUnitSlots = pinnedSlotsPerUnit[uKey] ?: emptySet()
                        val pinnedCountInWindow = (if (s1.index in pinnedUnitSlots) 1 else 0) +
                                                  (if (s2.index in pinnedUnitSlots) 1 else 0) +
                                                  (if (s3.index in pinnedUnitSlots) 1 else 0)
                        val maxAllowed = maxOf(2, pinnedCountInWindow)

                        val z1 = zVars[Pair(uKey, s1.index)]
                        val z2 = zVars[Pair(uKey, s2.index)]
                        val z3 = zVars[Pair(uKey, s3.index)]
                        if (z1 != null && z2 != null && z3 != null) {
                            model.addLessOrEqual(LinearExpr.newBuilder().add(z1).add(z2).add(z3).build(), maxAllowed.toLong())
                        }
                    }
                }
            }
        }

        // REGLA DE PINNED CLASSES (Pines fijados manualmente)
        for (lesson in lessons) {
            if (lesson.isPinned && lesson.timeSlot != null && lesson.profesor != null) {
                val uKey = UnitKey(lesson.grupo.curso, lesson.grupo.nombre, lesson.asignatura)
                val tIdx = slotIndexMap[lesson.timeSlot!!.id]
                val pIdx = teacherIndexMap[lesson.profesor!!.nombre]
                if (tIdx != null && pIdx != null) {
                    val pinVar = yVars[Triple(uKey, tIdx, pIdx)]
                    if (pinVar != null) {
                        model.addEquality(pinVar, 1)
                    }
                }
            }
        }

        // -------------------------------------------------------------------------
        // FUNCIÓN OBJETIVO LEXICOGRÁFICA (PYTHON):
        // 1º Maximizar nº de clases colocadas (W_CLASE = 1000)
        // 2º Maximizar pares de 60 min (W_PAR60 = 1)
        // 3º Bonus tutor si aplica (config.priorizarTutor)
        // -------------------------------------------------------------------------
        val W_CLASE = 1000L
        val W_PAR60 = 1L
        val objectiveExpr = LinearExpr.newBuilder()

        // 1. Maximizar clases colocadas
        for (zvar in zVars.values) {
            objectiveExpr.addTerm(zvar, W_CLASE)
        }

        // 2. Maximizar pares de 60 min
        val terminosPar = mutableListOf<BoolVar>()
        for (day in days) {
            val daySlots = timeSlots.withIndex().filter { it.value.dayOfWeek == day }.sortedBy { it.value.indiceDeFranja }
            for (i in 0 until daySlots.size - 1) {
                val s1 = daySlots[i]
                val s2 = daySlots[i + 1]
                if (s2.value.indiceDeFranja == s1.value.indiceDeFranja + 1 && s1.value.endTime == s2.value.startTime) {
                    for ((uKey, _) in unitsMap) {
                        val z1 = zVars[Pair(uKey, s1.index)]
                        val z2 = zVars[Pair(uKey, s2.index)]
                        if (z1 != null && z2 != null) {
                            val parVar = model.newBoolVar("par_${uKey.grupoCurso}_${uKey.grupoNombre}_${uKey.asignatura}_${s1.index}_${s2.index}")
                            model.addLessOrEqual(parVar, z1)
                            model.addLessOrEqual(parVar, z2)
                            terminosPar.add(parVar)
                            objectiveExpr.addTerm(parVar, W_PAR60)
                        }
                    }
                }
            }
        }

        // 3. Priorizar tutor si está configurado
        if (config.priorizarTutor && config.priorizarTutorPuntos > 0) {
            val bonusTutor = config.priorizarTutorPuntos.toLong()
            for ((uKey, uLessons) in unitsMap) {
                val sample = uLessons.first()
                val tutorName = sample.grupo.tutor.nombre
                if (tutorName.isNotEmpty()) {
                    val tutorPIdx = teacherIndexMap[tutorName]
                    if (tutorPIdx != null) {
                        val validSlots = validSlotsPerUnit[uKey] ?: continue
                        for (tIdx in validSlots) {
                            val yvar = yVars[Triple(uKey, tIdx, tutorPIdx)]
                            if (yvar != null) {
                                objectiveExpr.addTerm(yvar, bonusTutor)
                            }
                        }
                    }
                }
            }
        }

        // 4. Minimizar número de asignaturas distintas por profesor si está activado
        if (config.minimizarAsignaturasDistintas) {
            val W_SUBJ_BONUS = config.minimizarAsignaturasPuntos.toLong()
            for (pIdx in 0 until numTeachers) {
                val teacherObj = teachers[pIdx]
                for (subjName in teacherObj.asignaturas) {
                    val varsForSubj = yVars.entries
                        .filter { (tripleKey, _) -> tripleKey.first.asignatura == subjName && tripleKey.third == pIdx }
                        .map { it.value }

                    if (varsForSubj.isNotEmpty()) {
                        val usaSubj = model.newBoolVar("usa_subj_${pIdx}_$subjName")
                        for (yvar in varsForSubj) {
                            model.addImplication(yvar, usaSubj)
                        }
                        objectiveExpr.addTerm(usaSubj, -W_SUBJ_BONUS)
                    }
                }
            }
        }

        model.maximize(objectiveExpr.build())

        val prepTimeMs = System.currentTimeMillis() - startTimeMs
        logger.info("Modelo Google OR-Tools (Agregado Unidad) construido en ${prepTimeMs} ms.")

        // -------------------------------------------------------------------------
        // CP-SAT SOLVER & CALLBACK CON MONITOR DE ESTANCAMIENTO
        // -------------------------------------------------------------------------
        val solver = CpSolver()
        solver.parameters.maxTimeInSeconds = effectiveTimeLimit
        solver.parameters.numWorkers = maxOf(4, Runtime.getRuntime().availableProcessors())
        solver.parameters.searchBranching = com.google.ortools.sat.SatParameters.SearchBranching.PORTFOLIO_SEARCH
        solver.parameters.logSearchProgress = true

        val bestFoundLessons = AtomicReference<List<Leccion>?>(null)
        val bestSoftScore = AtomicInteger(0)
        val bestClassCount = AtomicInteger(0)
        val lastImprovementTime = AtomicLong(System.currentTimeMillis())
        val stoppedByStagnation = AtomicBoolean(false)

        val solutionCallback = object : CpSolverSolutionCallback() {
            override fun onSolutionCallback() {
                val obj = objectiveValue()
                val clasesColocadas = (obj / W_CLASE).toInt()
                val soft = (obj % W_CLASE).toInt()
                val bound = try { bestObjectiveBound().toInt() } catch (_: Exception) { 0 }

                if (clasesColocadas > bestClassCount.get()) {
                    bestClassCount.set(clasesColocadas)
                    lastImprovementTime.set(System.currentTimeMillis())
                }

                bestSoftScore.set(soft)

                // Asignar los valores a las lecciones individuales
                val solvedList = mutableListOf<Leccion>()
                for ((uKey, uLessons) in unitsMap) {
                    val validSlots = validSlotsPerUnit[uKey] ?: emptyList()
                    val assignedSlots = mutableListOf<Pair<TimeSlot, Profesor>>()

                    for (tIdx in validSlots) {
                        val zvar = zVars[Pair(uKey, tIdx)]
                        if (zvar != null && booleanValue(zvar)) {
                            var chosenTeacher: Profesor? = null
                            for (t in teachers) {
                                val pIdx = teacherIndexMap[t.nombre] ?: continue
                                val yvar = yVars[Triple(uKey, tIdx, pIdx)]
                                if (yvar != null && booleanValue(yvar)) {
                                    chosenTeacher = t
                                    break
                                }
                            }
                            assignedSlots.add(Pair(timeSlots[tIdx], chosenTeacher ?: teachers.first()))
                        }
                    }

                    val pinnedLessons = uLessons.filter { it.isPinned && it.timeSlot != null }
                    val unpinnedLessons = uLessons.filter { !it.isPinned || it.timeSlot == null }
                    val remainingAssignedSlots = assignedSlots.toMutableList()

                    for (pinned in pinnedLessons) {
                        val idx = remainingAssignedSlots.indexOfFirst { (slot, _) ->
                            slot.dayOfWeek == pinned.timeSlot!!.dayOfWeek && slot.startTime == pinned.timeSlot!!.startTime
                        }
                        if (idx >= 0) {
                            val assigned = remainingAssignedSlots.removeAt(idx)
                            solvedList.add(
                                Leccion(
                                    id = pinned.id,
                                    asignatura = pinned.asignatura,
                                    grupo = pinned.grupo,
                                    minutosSemanales = pinned.minutosSemanales,
                                    profesorFijo = pinned.profesorFijo
                                ).apply {
                                    isPinned = true
                                    timeSlot = assigned.first
                                    profesor = assigned.second
                                }
                            )
                        } else {
                            solvedList.add(
                                Leccion(
                                    id = pinned.id,
                                    asignatura = pinned.asignatura,
                                    grupo = pinned.grupo,
                                    minutosSemanales = pinned.minutosSemanales,
                                    profesorFijo = pinned.profesorFijo
                                ).apply {
                                    isPinned = true
                                    timeSlot = pinned.timeSlot
                                    profesor = pinned.profesor
                                }
                            )
                        }
                    }

                    for (unpinned in unpinnedLessons) {
                        val assigned = remainingAssignedSlots.removeFirstOrNull()
                        solvedList.add(
                            Leccion(
                                id = unpinned.id,
                                asignatura = unpinned.asignatura,
                                grupo = unpinned.grupo,
                                minutosSemanales = unpinned.minutosSemanales,
                                profesorFijo = unpinned.profesorFijo
                            ).apply {
                                isPinned = false
                                timeSlot = assigned?.first
                                profesor = assigned?.second
                            }
                        )
                    }
                }

                bestFoundLessons.set(solvedList)

                if (isStopped != null && isStopped()) {
                    logger.info("Detención solicitada por usuario: llamando a stopSearch()...")
                    stopSearch()
                }

                val objVal = try { objectiveValue().toLong() } catch (_: Exception) { 0L }
                val boundVal = try { bestObjectiveBound().toLong() } catch (_: Exception) { 0L }
                val (hardScoreVal, conflictosVal) = diagnosticarDeficit(solvedList, unitsMap, teachers, numSlots, config)

                onProgress?.invoke(
                    SolverProgress(
                        status = CpSolverStatus.FEASIBLE,
                        isFeasible = true,
                        hardScore = hardScoreVal,
                        softScore = soft,
                        bestBound = boundVal,
                        rawObjective = objVal,
                        conflictos = conflictosVal,
                        solvedLessons = solvedList
                    )
                )
            }
        }

        // Hilo Monitor de Estancamiento
        val stopMonitor = AtomicBoolean(false)
        if (stagnationSeconds > 0) {
            val monitorThread = Thread {
                while (!stopMonitor.get()) {
                    try {
                        Thread.sleep(1000)
                    } catch (_: InterruptedException) {
                        break
                    }
                    val elapsedSinceLastImprovement = (System.currentTimeMillis() - lastImprovementTime.get()) / 1000.0
                    if (elapsedSinceLastImprovement >= stagnationSeconds) {
                        logger.info("Estancamiento detectado: sin mejoras durante ${elapsedSinceLastImprovement}s (límite: ${stagnationSeconds}s). Deteniendo solver...")
                        stoppedByStagnation.set(true)
                        solver.stopSearch()
                        break
                    }
                }
            }
            monitorThread.isDaemon = true
            monitorThread.start()
        }

        logger.info("Resolviendo modelo con Google OR-Tools CP-SAT (límite: ${effectiveTimeLimit}s, estancamiento: ${stagnationSeconds}s, workers: ${solver.parameters.numWorkers})...")
        val status = solver.solve(model, solutionCallback)
        stopMonitor.set(true)

        logger.info("Google OR-Tools finalizado en ${(solver.wallTime() * 1000).toLong()} ms con status $status.")

        val finalLessons = bestFoundLessons.get() ?: lessons
        val isFeasible = status == CpSolverStatus.FEASIBLE || status == CpSolverStatus.OPTIMAL || bestFoundLessons.get() != null
        val finalStatus = if (isFeasible && status == CpSolverStatus.UNKNOWN) CpSolverStatus.FEASIBLE else status

        // -------------------------------------------------------------------------
        // DIAGNÓSTICO DETALLADO DE DÉFICIT DE CLASES NO COLOCADAS (Causas Raíz)
        // -------------------------------------------------------------------------
        val (hardScoreVal, conflictosVal) = diagnosticarDeficit(finalLessons, unitsMap, teachers, numSlots, config)

        val conflictosDiagnostico = mutableListOf<String>()
        if (stoppedByStagnation.get()) {
            conflictosDiagnostico.add("🛑 Parada automática por estancamiento: pasaron ${stagnationSeconds.toInt()}s sin colocar más clases. Se guardó el mejor horario parcial encontrado.")
        }
        conflictosDiagnostico.addAll(conflictosVal)

        if (!isFeasible) {
            conflictosDiagnostico.addAll(Prevalidation.detectarConflictosInviabilidad(lessons, timeSlots, teachers, config))
        }

        val finalBound = try { solver.bestObjectiveBound().toLong() } catch (_: Exception) { 0L }
        val finalObj = try { solver.objectiveValue().toLong() } catch (_: Exception) { 0L }

        return SolverProgress(
            status = finalStatus,
            isFeasible = isFeasible,
            hardScore = hardScoreVal,
            softScore = bestSoftScore.get(),
            bestBound = finalBound,
            rawObjective = finalObj,
            conflictos = conflictosDiagnostico,
            solvedLessons = finalLessons,
            stoppedByStagnation = stoppedByStagnation.get()
        )
    }

    private fun diagnosticarDeficit(
        currentLessons: List<Leccion>,
        unitsMap: Map<UnitKey, List<Leccion>>,
        teachers: List<Profesor>,
        numSlots: Int,
        config: Configuracion
    ): Pair<Int, List<String>> {
        val colocadasPorUnidad = mutableMapOf<UnitKey, Int>()
        val grupoColocados = mutableMapOf<String, Int>()
        val profeColocados = mutableMapOf<String, Int>()

        for (l in currentLessons) {
            if (l.timeSlot != null && l.profesor != null) {
                val key = UnitKey(l.grupo.curso, l.grupo.nombre, l.asignatura)
                colocadasPorUnidad[key] = (colocadasPorUnidad[key] ?: 0) + 1

                val gName = "${l.grupo.curso} ${l.grupo.nombre}"
                grupoColocados[gName] = (grupoColocados[gName] ?: 0) + 1
                profeColocados[l.profesor!!.nombre] = (profeColocados[l.profesor!!.nombre] ?: 0) + 1
            }
        }

        val deficitUnidades = mutableListOf<Pair<UnitKey, Int>>()
        for ((uKey, uLessons) in unitsMap) {
            val colocadas = colocadasPorUnidad[uKey] ?: 0
            val solicitadas = uLessons.size
            if (colocadas < solicitadas) {
                deficitUnidades.add(Pair(uKey, solicitadas - colocadas))
            }
        }

        if (deficitUnidades.isEmpty()) {
            return Pair(0, emptyList())
        }

        val totalDeficit = deficitUnidades.sumOf { it.second }
        val conflictos = mutableListOf<String>()

        for ((uKey, falta) in deficitUnidades.sortedByDescending { it.second }) {
            val totalSolicitado = unitsMap[uKey]?.size ?: 0
            val gName = "${uKey.grupoCurso} ${uKey.grupoNombre}"
            val causas = mutableListOf<String>()

            if ((grupoColocados[gName] ?: 0) >= numSlots) {
                causas.add("Horario del grupo completo ($numSlots/$numSlots franjas ocupadas)")
            }

            val sample = unitsMap[uKey]?.firstOrNull()
            val elegibles = teachers.filter { t ->
                if (sample?.profesorFijo != null) t.nombre == sample.profesorFijo.nombre
                else sample?.let { Prevalidation.isTeacherQualified(t, it.asignatura, config) } ?: false
            }

            for (p in elegibles) {
                val maxBloques = p.minutosMaximos / config.tiempoMinimo
                val ocupados = profeColocados[p.nombre] ?: 0
                if (ocupados >= maxBloques) {
                    causas.add("Prof. '${p.nombre}' con jornada completa ($ocupados/$maxBloques bloques)")
                }
            }

            val causaStr = if (causas.isNotEmpty()) causas.joinToString("; ") else "Sin franja horaria común libre entre grupo y docente"
            conflictos.add("⚠️ Clases Sin Colocar: '${uKey.asignatura}' en $gName (Faltan $falta de $totalSolicitado bloques) → $causaStr.")
        }

        return Pair(-totalDeficit, conflictos)
    }
}
