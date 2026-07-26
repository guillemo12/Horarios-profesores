package com.colegio.solver

import com.colegio.DTO.Configuracion
import com.google.ortools.Loader
import com.google.ortools.sat.*
import org.slf4j.LoggerFactory
import java.time.DayOfWeek

data class SolverProgress(
    val status: CpSolverStatus,
    val isFeasible: Boolean,
    val hardScore: Int,
    val softScore: Int,
    val bestBound: Int = 0,
    val conflictos: List<String>,
    val solvedLessons: List<Leccion>
)

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

    fun solve(
        timeSlots: List<TimeSlot>,
        lessons: List<Leccion>,
        teachers: List<Profesor>,
        config: Configuracion,
        timeLimitSeconds: Double = 360000.0,
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

        // =========================================================================
        // PRE-VALIDACIÓN ULTRA-RÁPIDA DE FACTIBILIDAD EN MILISEGUNDOS
        // =========================================================================
        val preValidationConflicts = Prevalidation.detectarConflictosInviabilidad(lessons, timeSlots, teachers, config)
        if (preValidationConflicts.isNotEmpty()) {
            logger.warn("Inviabilidad matemática detectada al instante en pre-validación (${preValidationConflicts.size} conflictos):")
            preValidationConflicts.forEach { conflicto ->
                logger.warn("   ❌ $conflicto")
            }
            return SolverProgress(
                status = CpSolverStatus.INFEASIBLE,
                isFeasible = false,
                hardScore = -preValidationConflicts.size,
                softScore = 0,
                conflictos = preValidationConflicts,
                solvedLessons = lessons
            )
        }

        val model = CpModel()
        val teacherIndexMap = teachers.withIndex().associate { it.value.nombre to it.index }
        val slotIndexMap = timeSlots.withIndex().associate { it.value.id to it.index }

        val groupNames = lessons.map { "${it.grupo.curso} ${it.grupo.nombre}" }.distinct()
        val groupIndexMap = groupNames.withIndex().associate { it.value to it.index }
        val numGroups = groupNames.size

        val varsByLesson = List(numLessons) { mutableListOf<Triple<Int, Int, BoolVar>>() }
        val varsByTeacherSlot = List(numTeachers) { List(numSlots) { mutableListOf<BoolVar>() } }
        val varsByGroupSlot = List(numGroups) { List(numSlots) { mutableListOf<BoolVar>() } }
        val varsByTeacher = List(numTeachers) { mutableListOf<Triple<Int, Int, BoolVar>>() }
        val varsByGroupSubjectTeacher = mutableMapOf<Pair<String, String>, List<MutableList<BoolVar>>>()
        val varsByGroupSubjectDay = mutableMapOf<Triple<String, String, DayOfWeek>, MutableList<Triple<Int, Int, BoolVar>>>()
        val varsByGroupSubjectSlot = mutableMapOf<Triple<String, String, Int>, MutableList<BoolVar>>()

        // 1. Crear variables booleanas x[l, t, p] en O(1)
        for ((lIdx, lesson) in lessons.withIndex()) {
            val gName = "${lesson.grupo.curso} ${lesson.grupo.nombre}"
            val gIdx = groupIndexMap[gName] ?: continue

            val validTeachers = teachers.filter { teacher ->
                if (lesson.profesorFijo != null) {
                    teacher.nombre == lesson.profesorFijo.nombre
                } else {
                    Prevalidation.isTeacherQualified(teacher, lesson.asignatura, config)
                }
            }

            val validSlots = timeSlots.filterIndexed { _, slot ->
                if (lesson.isPinned && lesson.timeSlot != null) {
                    slot.id == lesson.timeSlot!!.id
                } else true
            }

            for (slot in validSlots) {
                val tIdx = slotIndexMap[slot.id] ?: continue

                for (teacher in validTeachers) {
                    val pIdx = teacherIndexMap[teacher.nombre] ?: continue

                    if (config.respetarDisponibilidad && teacher.availability.isNotEmpty()) {
                        val disponible = teacher.availability.any { av ->
                            av.dayOfWeek == slot.dayOfWeek.value &&
                                    slot.startTime.toString() >= av.startTime &&
                                    slot.endTime.toString() <= av.endTime
                        }
                        if (!disponible) continue
                    }

                    val varName = "x_${lIdx}_${tIdx}_${pIdx}"
                    val boolVar = model.newBoolVar(varName)

                    val triple = Triple(tIdx, pIdx, boolVar)
                    varsByLesson[lIdx].add(triple)
                    varsByTeacherSlot[pIdx][tIdx].add(boolVar)
                    varsByGroupSlot[gIdx][tIdx].add(boolVar)
                    varsByTeacher[pIdx].add(Triple(lIdx, tIdx, boolVar))

                    val gsKey = Pair(gName, lesson.asignatura)
                    val gsTeachers = varsByGroupSubjectTeacher.getOrPut(gsKey) { List(numTeachers) { mutableListOf() } }
                    gsTeachers[pIdx].add(boolVar)

                    val gsdKey = Triple(gName, lesson.asignatura, slot.dayOfWeek)
                    val gsdList = varsByGroupSubjectDay.getOrPut(gsdKey) { mutableListOf() }
                    gsdList.add(Triple(lIdx, tIdx, boolVar))

                    val gssKey = Triple(gName, lesson.asignatura, tIdx)
                    val gssList = varsByGroupSubjectSlot.getOrPut(gssKey) { mutableListOf() }
                    gssList.add(boolVar)
                }
            }
        }

        // HARD 1: Cada lección asignada exactamente a 1 combinación (franja, profesor) - O(1)
        for (lIdx in 0 until numLessons) {
            val lessonVars = varsByLesson[lIdx].map { item -> item.third }
            if (lessonVars.isNotEmpty()) {
                model.addEquality(LinearExpr.sum(lessonVars.toTypedArray()), 1)
            } else {
                val lesson = lessons[lIdx]
                return SolverProgress(
                    status = CpSolverStatus.INFEASIBLE,
                    isFeasible = false,
                    hardScore = -1,
                    softScore = 0,
                    conflictos = listOf("❌ Sin Docente Válido: No hay ningún profesor calificado disponible para la asignatura '${lesson.asignatura}' del grupo '${lesson.grupo.curso} ${lesson.grupo.nombre}'.\n💡 Solución: Añada la especialidad '${lesson.asignatura}' a un profesor en su ficha o asígnele en el Reparto Docente."),
                    solvedLessons = lessons
                )
            }
        }

        // HARD 2: Conflicto de Profesor (Máximo 1 clase por franja) - O(1)
        for (pIdx in 0 until numTeachers) {
            for (tIdx in 0 until numSlots) {
                val tsVars = varsByTeacherSlot[pIdx][tIdx]
                if (tsVars.size > 1) {
                    model.addLessOrEqual(LinearExpr.sum(tsVars.toTypedArray()), 1)
                }
            }
        }

        // HARD 3: Conflicto de Grupo (Máximo 1 clase por franja) - O(1)
        for (gIdx in 0 until numGroups) {
            for (tIdx in 0 until numSlots) {
                val gsVars = varsByGroupSlot[gIdx][tIdx]
                if (gsVars.size > 1) {
                    model.addLessOrEqual(LinearExpr.sum(gsVars.toTypedArray()), 1)
                }
            }
        }

        // HARD 4: Profesor único por materia y grupo - O(1)
        val groupSubjectPairs = lessons.map { Pair("${it.grupo.curso} ${it.grupo.nombre}", it.asignatura) }.distinct()

        for (gsKey in groupSubjectPairs) {
            val teacherLists = varsByGroupSubjectTeacher[gsKey] ?: continue
            val teacherChoiceVars = mutableListOf<BoolVar>()

            for (pIdx in 0 until numTeachers) {
                val pVars = teacherLists[pIdx]
                if (pVars.isNotEmpty()) {
                    val tVar = model.newBoolVar("tchoice_${gsKey.first}_${gsKey.second}_$pIdx")
                    teacherChoiceVars.add(tVar)
                    for (xVar in pVars) {
                        model.addImplication(xVar, tVar)
                    }
                }
            }
            if (teacherChoiceVars.isNotEmpty()) {
                model.addEquality(LinearExpr.sum(teacherChoiceVars.toTypedArray()), 1)
            }
        }

        // HARD 5: Límite de Horas Semanales del Profesor - O(1)
        if (config.respetarLimiteHoras) {
            for (pIdx in 0 until numTeachers) {
                val pVarsList = varsByTeacher[pIdx]
                if (pVarsList.isNotEmpty()) {
                    val xVars = pVarsList.map { item -> item.third }.toTypedArray()
                    val durations = pVarsList.map { item -> timeSlots[item.second].duracionMinutos.toLong() }.toLongArray()
                    model.addLessOrEqual(LinearExpr.weightedSum(xVars, durations), teachers[pIdx].minutosMaximos.toLong())
                }
            }
        }

        // HARD 6: Límite Máximo de Minutos Diarios por Asignatura y Grupo - O(1)
        val days = DayOfWeek.values().filter { it.value in 1..5 }
        for (pair in groupSubjectPairs) {
            val gName = pair.first
            val asignatura = pair.second
            val sampleLesson = lessons.firstOrNull { "${it.grupo.curso} ${it.grupo.nombre}" == gName && it.asignatura == asignatura } ?: continue
            val promedioDiario = sampleLesson.minutosSemanales / 5.0
            val bloquesNecesarios = Math.ceil(promedioDiario / config.tiempoMinimo).toInt()
            val limiteMatematico = bloquesNecesarios * config.tiempoMinimo
            val limiteDiarioReal = maxOf(config.tiempoMaximo + config.tiempoMinimo, limiteMatematico + config.tiempoMinimo)

            for (day in days) {
                val gsdList = varsByGroupSubjectDay[Triple(gName, asignatura, day)] ?: continue
                if (gsdList.isNotEmpty()) {
                    val xVars = gsdList.map { item -> item.third }.toTypedArray()
                    val durations = gsdList.map { item -> timeSlots[item.second].duracionMinutos.toLong() }.toLongArray()
                    model.addLessOrEqual(LinearExpr.weightedSum(xVars, durations), limiteDiarioReal.toLong())
                }
            }
        }

        // HARD 7: Respetar Lecciones Fijadas (Pinned Classes) - O(1)
        for ((lIdx, lesson) in lessons.withIndex()) {
            if (lesson.isPinned && lesson.timeSlot != null && lesson.profesor != null) {
                val tIdx = slotIndexMap[lesson.timeSlot!!.id]
                val pIdx = teacherIndexMap[lesson.profesor!!.nombre]
                if (tIdx != null && pIdx != null) {
                    val pinVar = varsByLesson[lIdx].firstOrNull { it.first == tIdx && it.second == pIdx }?.third
                    if (pinVar != null) {
                        model.addEquality(pinVar, 1)
                    }
                }
            }
        }

        // OPTIMIZACIÓN SOFT CONEXA
        val objectiveExpr = LinearExpr.newBuilder()

        // SOFT 1: Compactar Horario Temprano - O(1)
        if (config.compactarTempranoPuntos > 0) {
            for (lIdx in 0 until numLessons) {
                for (item in varsByLesson[lIdx]) {
                    val slot = timeSlots[item.first]
                    val penalty = (slot.indiceDeFranja * config.compactarTempranoPuntos).toLong()
                    if (penalty > 0) {
                        objectiveExpr.addTerm(item.third, -penalty)
                    }
                }
            }
        }

        // SOFT 2: Priorizar Tutor del Grupo - O(1)
        if (config.priorizarTutor && config.priorizarTutorPuntos > 0) {
            for (lIdx in 0 until numLessons) {
                val lesson = lessons[lIdx]
                val tutorName = lesson.grupo.tutor.nombre
                if (tutorName.isNotEmpty()) {
                    val tutorPIdx = teacherIndexMap[tutorName]
                    if (tutorPIdx != null) {
                        for (item in varsByLesson[lIdx]) {
                            if (item.second == tutorPIdx) {
                                objectiveExpr.addTerm(item.third, config.priorizarTutorPuntos.toLong())
                            }
                        }
                    }
                }
            }
        }

        // SOFT 3: Fomentar Bloques de 60 Minutos - O(1)
        if (config.fomentarBloques60Puntos > 0) {
            for (day in days) {
                val daySlots = timeSlots.withIndex().filter { it.value.dayOfWeek == day }.sortedBy { it.value.indiceDeFranja }
                for (i in 0 until daySlots.size - 1) {
                    val s1 = daySlots[i]
                    val s2 = daySlots[i + 1]
                    if (s2.value.indiceDeFranja == s1.value.indiceDeFranja + 1) {
                        for (pair in groupSubjectPairs) {
                            val gName = pair.first
                            val asignatura = pair.second

                            val s1Vars = varsByGroupSubjectSlot[Triple(gName, asignatura, s1.index)] ?: continue
                            val s2Vars = varsByGroupSubjectSlot[Triple(gName, asignatura, s2.index)] ?: continue

                            if (s1Vars.isNotEmpty() && s2Vars.isNotEmpty()) {
                                val s1Active = model.newBoolVar("act_${gName}_${asignatura}_${s1.index}")
                                val s2Active = model.newBoolVar("act_${gName}_${asignatura}_${s2.index}")
                                model.addEquality(s1Active, LinearExpr.sum(s1Vars.toTypedArray()))
                                model.addEquality(s2Active, LinearExpr.sum(s2Vars.toTypedArray()))

                                val blockVar = model.newBoolVar("b60_${gName}_${asignatura}_${s1.index}")
                                model.addLessOrEqual(blockVar, s1Active)
                                model.addLessOrEqual(blockVar, s2Active)
                                objectiveExpr.addTerm(blockVar, config.fomentarBloques60Puntos.toLong())
                            }
                        }
                    }
                }
            }
        }

        // SOFT 4: Evitar Huecos Libres Intermedios
        if (config.evitarHuecosPuntos > 0) {
            for (gIdx in 0 until numGroups) {
                val gName = groupNames[gIdx]
                for (day in days) {
                    val daySlots = timeSlots.withIndex().filter { it.value.dayOfWeek == day }.sortedBy { it.value.indiceDeFranja }
                    val K = daySlots.size
                    if (K <= 2) continue

                    val activeVars = daySlots.map { slotEntry ->
                        val varsInSlot = varsByGroupSlot[gIdx][slotEntry.index]
                        if (varsInSlot.isNotEmpty()) {
                            val aVar = model.newBoolVar("act_${gName}_d${day.value}_s${slotEntry.index}")
                            model.addEquality(aVar, LinearExpr.sum(varsInSlot.toTypedArray()))
                            aVar
                        } else null
                    }

                    for (k in 1 until K - 1) {
                        val currActive = activeVars[k]
                        val prevActive = activeVars[k - 1]
                        val nextActive = activeVars[k + 1]

                        if (prevActive != null && nextActive != null) {
                            val gapVar = model.newBoolVar("gap_${gName}_d${day.value}_$k")
                            val exprBuilder = LinearExpr.newBuilder().add(gapVar)
                            if (currActive != null) exprBuilder.add(currActive)
                            exprBuilder.addTerm(prevActive, -1).addTerm(nextActive, -1)

                            model.addGreaterOrEqual(exprBuilder.build(), -1)
                            objectiveExpr.addTerm(gapVar, -config.evitarHuecosPuntos.toLong())
                        }
                    }
                }
            }
        }

        model.maximize(objectiveExpr.build())

        val prepTimeMs = System.currentTimeMillis() - startTimeMs
        logger.info("Modelo Google OR-Tools construido en ${prepTimeMs} ms.")

        val solver = CpSolver()
        solver.parameters.maxTimeInSeconds = timeLimitSeconds
        solver.parameters.numWorkers = maxOf(4, Runtime.getRuntime().availableProcessors())
        solver.parameters.searchBranching = com.google.ortools.sat.SatParameters.SearchBranching.PORTFOLIO_SEARCH
        solver.parameters.logSearchProgress = true
        val bestFoundLessons = java.util.concurrent.atomic.AtomicReference<List<Leccion>?>(null)
        val bestSoftScore = java.util.concurrent.atomic.AtomicInteger(0)

        val solutionCallback = object : CpSolverSolutionCallback() {
            override fun onSolutionCallback() {
                val currentSoft = objectiveValue().toInt()
                val bound = try { bestObjectiveBound().toInt() } catch (_: Exception) { 0 }
                bestSoftScore.set(currentSoft)

                val solvedList = lessons.mapIndexed { lIdx, lesson ->
                    var chosenSlot: TimeSlot? = null
                    var chosenTeacher: Profesor? = null

                    for (item in varsByLesson[lIdx]) {
                        if (booleanValue(item.third)) {
                            chosenSlot = timeSlots[item.first]
                            chosenTeacher = teachers[item.second]
                            break
                        }
                    }
                    Leccion(
                        id = lesson.id,
                        asignatura = lesson.asignatura,
                        grupo = lesson.grupo,
                        minutosSemanales = lesson.minutosSemanales,
                        profesorFijo = lesson.profesorFijo
                    ).apply {
                        isPinned = lesson.isPinned
                        timeSlot = chosenSlot
                        profesor = chosenTeacher
                    }
                }

                bestFoundLessons.set(solvedList)

                if (isStopped != null && isStopped()) {
                    logger.info("Detención solicitada por usuario: llamando a stopSearch() en solver...")
                    stopSearch()
                }

                onProgress?.invoke(
                    SolverProgress(
                        status = CpSolverStatus.FEASIBLE,
                        isFeasible = true,
                        hardScore = 0,
                        softScore = currentSoft,
                        bestBound = bound,
                        conflictos = emptyList(),
                        solvedLessons = solvedList
                    )
                )
            }
        }

        logger.info("Resolviendo modelo con Google OR-Tools CP-SAT (límite: ${timeLimitSeconds}s, workers: ${solver.parameters.numWorkers})...")
        val status = solver.solve(model, solutionCallback)

        logger.info("Google OR-Tools finalizado en ${(solver.wallTime() * 1000).toLong()} ms con status $status.")

        val finalLessons = bestFoundLessons.get()
        val isFeasible = status == CpSolverStatus.FEASIBLE || status == CpSolverStatus.OPTIMAL || finalLessons != null
        val finalStatus = if (isFeasible && status == CpSolverStatus.UNKNOWN) CpSolverStatus.FEASIBLE else status

        val finalSoftScore = if (finalLessons != null) bestSoftScore.get() else 0
        val finalBound = try { solver.bestObjectiveBound().toInt() } catch (_: Exception) { 0 }

        val conflicts = mutableListOf<String>()
        if (!isFeasible) {
            conflicts.addAll(Prevalidation.detectarConflictosInviabilidad(lessons, timeSlots, teachers, config))
        }

        val solvedList = finalLessons ?: lessons
        val finalHardScore = if (isFeasible) 0 else conflicts.size.coerceAtLeast(1)

        return SolverProgress(
            status = finalStatus,
            isFeasible = isFeasible,
            hardScore = finalHardScore,
            softScore = finalSoftScore,
            bestBound = finalBound,
            conflictos = conflicts,
            solvedLessons = solvedList
        )
    }
}
