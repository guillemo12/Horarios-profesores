package com.colegio

import com.colegio.DTO.CourseDto
import com.colegio.DTO.CourseGroupDto
import com.colegio.modelos.entities.*
import com.colegio.modelos.tables.*
import org.jetbrains.exposed.dao.id.EntityID
import org.jetbrains.exposed.sql.insert
import org.jetbrains.exposed.sql.selectAll
import org.jetbrains.exposed.sql.transactions.transaction
import java.io.File
import kotlin.system.measureNanoTime
import kotlin.test.BeforeTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class CourseRouteBenchmarkTest {

    @BeforeTest
    fun setup() {
        val tempDb = File(System.getProperty("java.io.tmpdir"), "test_course_benchmark.db")
        if (tempDb.exists()) tempDb.delete()
        System.setProperty("eduschedule.db.path", tempDb.absolutePath)
        reconnectDatabase()

        // Seed database with large dataset
        transaction {
            val prof = ProfesorEntity.new {
                nombre = "Profesor General Benchmark"
                minutosMaximos = 1350
                color = "#3b82f6"
            }

            // Create 50 courses
            for (cIdx in 1..50) {
                val curso = CursosEntity.new {
                    nombre = "Curso Benchmark $cIdx"
                }

                // 5 subjects per course = 250 subjects total
                val subjectEntities = (1..5).map { sIdx ->
                    AsignaturaEntity.new {
                        nombre = "Asignatura $cIdx-$sIdx"
                        this.curso = curso
                        minutos = 180
                    }
                }

                // 2 groups per course = 100 groups total
                val groupEntities = (1..2).map { gIdx ->
                    GruposEntity.new {
                        nombre = "Grupo $gIdx"
                        this.curso = curso
                        this.tutor = prof
                    }
                }

                // RepartoDocente assignments
                for (g in groupEntities) {
                    for (s in subjectEntities) {
                        RepartoDocenteTable.insert { row ->
                            row[RepartoDocenteTable.grupoId] = g.id
                            row[RepartoDocenteTable.asignaturaId] = s.id
                            row[RepartoDocenteTable.profesorId] = prof.id
                        }
                    }
                }
            }
        }
    }

    private fun fetchCoursesUnoptimized(): List<CourseDto> {
        return transaction {
            CursosEntity.all().map { c ->
                val subjectsList = AsignaturaEntity.find { AsignaturaTable.curso eq c.id }.map { it.id.value.toString() }
                val groupsList = GruposEntity.find { GruposTable.curso eq c.id }.map { g ->
                    val repartos = RepartoDocenteTable.selectAll().where { RepartoDocenteTable.grupoId eq g.id.value }
                    val assignmentsMap = mutableMapOf<String, String>()
                    repartos.forEach { row ->
                        val subId = row[RepartoDocenteTable.asignaturaId].value.toString()
                        val profId = row[RepartoDocenteTable.profesorId]?.value?.toString() ?: ""
                        if (profId.isNotEmpty()) assignmentsMap[subId] = profId
                    }
                    CourseGroupDto(
                        id = g.id.value.toString(),
                        name = g.nombre,
                        tutorId = g.tutor.id.value.toString(),
                        assignments = assignmentsMap
                    )
                }
                CourseDto(
                    id = c.id.value.toString(),
                    name = c.nombre,
                    subjects = subjectsList,
                    groups = groupsList
                )
            }
        }
    }

    private fun fetchCoursesOptimized(): List<CourseDto> {
        return transaction {
            val courses = CursosEntity.all().toList()

            val subjectsByCourse = AsignaturaEntity.all()
                .groupBy { it.curso.id.value.toString() }

            val groupsByCourse = GruposEntity.all()
                .groupBy { it.curso.id.value.toString() }

            val repartosByGroup = RepartoDocenteTable.selectAll()
                .groupBy { it[RepartoDocenteTable.grupoId].value.toString() }

            courses.map { c ->
                val courseIdStr = c.id.value.toString()
                val subjectsList = subjectsByCourse[courseIdStr]?.map { it.id.value.toString() } ?: emptyList()
                val groupsList = groupsByCourse[courseIdStr]?.map { g ->
                    val groupIdStr = g.id.value.toString()
                    val repartos = repartosByGroup[groupIdStr] ?: emptyList()
                    val assignmentsMap = mutableMapOf<String, String>()
                    repartos.forEach { row ->
                        val subId = row[RepartoDocenteTable.asignaturaId].value.toString()
                        val profId = row[RepartoDocenteTable.profesorId]?.value?.toString() ?: ""
                        if (profId.isNotEmpty()) assignmentsMap[subId] = profId
                    }
                    CourseGroupDto(
                        id = groupIdStr,
                        name = g.nombre,
                        tutorId = g.tutor.id.value.toString(),
                        assignments = assignmentsMap
                    )
                } ?: emptyList()

                CourseDto(
                    id = courseIdStr,
                    name = c.nombre,
                    subjects = subjectsList,
                    groups = groupsList
                )
            }
        }
    }

    @Test
    fun `benchmark courses fetching comparing unoptimized vs optimized`() {
        // Warmup
        val warmup1 = fetchCoursesUnoptimized()
        val warmup2 = fetchCoursesOptimized()
        assertEquals(warmup1, warmup2)

        val runs = 20
        val unoptimizedTimes = mutableListOf<Long>()
        val optimizedTimes = mutableListOf<Long>()

        for (i in 1..runs) {
            val elapsedUnoptimized = measureNanoTime {
                fetchCoursesUnoptimized()
            }
            unoptimizedTimes.add(elapsedUnoptimized)

            val elapsedOptimized = measureNanoTime {
                fetchCoursesOptimized()
            }
            optimizedTimes.add(elapsedOptimized)
        }

        val avgUnoptimizedMs = unoptimizedTimes.average() / 1_000_000.0
        val avgOptimizedMs = optimizedTimes.average() / 1_000_000.0
        val speedup = avgUnoptimizedMs / avgOptimizedMs

        println("=== COURSE BENCHMARK COMPARISON ===")
        println("Unoptimized (N+1 queries): ${avgUnoptimizedMs} ms")
        println("Optimized (Batch queries): ${avgOptimizedMs} ms")
        println("Speedup factor: ${speedup}x")

        assertTrue(avgOptimizedMs < avgUnoptimizedMs, "Optimized implementation should be faster than unoptimized N+1 implementation")
    }
}
