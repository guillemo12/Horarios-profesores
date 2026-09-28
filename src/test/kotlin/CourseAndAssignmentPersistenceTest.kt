package com.colegio

import com.colegio.modelos.entities.*
import com.colegio.modelos.tables.GruposTable
import com.colegio.modelos.tables.RepartoDocenteTable
import org.jetbrains.exposed.dao.id.EntityID
import org.jetbrains.exposed.sql.SqlExpressionBuilder.eq
import org.jetbrains.exposed.sql.deleteWhere
import org.jetbrains.exposed.sql.insert
import org.jetbrains.exposed.sql.selectAll
import org.jetbrains.exposed.sql.transactions.transaction
import java.io.File
import kotlin.test.AfterTest
import kotlin.test.BeforeTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotNull

class CourseAndAssignmentPersistenceTest {

    private val tempDb = File(System.getProperty("java.io.tmpdir"), "test_course_assignments.db")

    @BeforeTest
    fun setup() {
        if (tempDb.exists()) {
            tempDb.delete()
        }
        System.setProperty("eduschedule.db.path", tempDb.absolutePath)
        reconnectDatabase()
    }

    @AfterTest
    fun tearDown() {
        System.clearProperty("eduschedule.db.path")
        if (tempDb.exists()) {
            tempDb.delete()
        }
        reconnectDatabase()
    }

    @Test
    fun `test creating course and persisting group assignments in RepartoDocenteTable`() {
        transaction {
            // 1. Crear profesor y asignatura
            val prof = ProfesorEntity.new {
                nombre = "Profesor Prueba Test"
                minutosMaximos = 1350
                color = "#3b82f6"
            }

            val curso = CursosEntity.new {
                nombre = "Curso Test 101"
            }

            val asig = AsignaturaEntity.new {
                nombre = "Matemáticas Test"
                this.curso = curso
                minutos = 300
            }

            // 2. Crear grupo
            val grupo = GruposEntity.new {
                nombre = "A"
                this.curso = curso
                this.tutor = prof
            }

            // 3. Insertar asignación en RepartoDocenteTable
            RepartoDocenteTable.insert { row ->
                row[RepartoDocenteTable.grupoId] = grupo.id
                row[RepartoDocenteTable.asignaturaId] = asig.id
                row[RepartoDocenteTable.profesorId] = prof.id
            }

            // 4. Verificar persistencia directa
            val rows = RepartoDocenteTable.selectAll().where { RepartoDocenteTable.grupoId eq grupo.id.value }.toList()
            assertEquals(1, rows.size, "Debe haber 1 fila en RepartoDocenteTable")
            assertEquals(asig.id.value, rows[0][RepartoDocenteTable.asignaturaId].value)
            assertEquals(prof.id.value, rows[0][RepartoDocenteTable.profesorId]?.value)

            // 5. Actualizar asignación (limpiar y reasignar)
            RepartoDocenteTable.deleteWhere { grupoId eq grupo.id.value }
            val rowsAfterDelete = RepartoDocenteTable.selectAll().where { RepartoDocenteTable.grupoId eq grupo.id.value }.toList()
            assertEquals(0, rowsAfterDelete.size, "Debe quedar vacío tras eliminar")
        }
    }

    @Test
    fun `test group assignments retrieval happy path with multiple groups`() {
        transaction {
            val prof = ProfesorEntity.new {
                nombre = "Profesor General"
                minutosMaximos = 1350
                color = "#3b82f6"
            }
            val curso = CursosEntity.new { nombre = "1º ESO" }
            val asig = AsignaturaEntity.new {
                nombre = "Lengua"
                this.curso = curso
                minutos = 240
            }

            // Crear 50 grupos con asignaciones
            val groupCount = 50
            val groups = (1..groupCount).map { i ->
                val g = GruposEntity.new {
                    nombre = "Grupo $i"
                    this.curso = curso
                    this.tutor = prof
                }
                RepartoDocenteTable.insert { row ->
                    row[RepartoDocenteTable.grupoId] = g.id
                    row[RepartoDocenteTable.asignaturaId] = asig.id
                    row[RepartoDocenteTable.profesorId] = prof.id
                }
                g
            }

            // 1. Enfoque N+1 anterior (Baseline)
            val startTimeBaseline = System.nanoTime()
            val subjectsList = AsignaturaEntity.find { com.colegio.modelos.tables.AsignaturaTable.curso eq curso.id }.map { it.id.value.toString() }
            val courseGroupsBaseline = GruposEntity.find { com.colegio.modelos.tables.GruposTable.curso eq curso.id }.toList()
            val groupDtosBaseline = courseGroupsBaseline.map { g ->
                val repartos = RepartoDocenteTable.selectAll().where { RepartoDocenteTable.grupoId eq g.id.value }
                val assignmentsMap = mutableMapOf<String, String>()
                repartos.forEach { row ->
                    val subId = row[RepartoDocenteTable.asignaturaId].value.toString()
                    val profId = row[RepartoDocenteTable.profesorId]?.value?.toString() ?: ""
                    if (profId.isNotEmpty()) assignmentsMap[subId] = profId
                }
                com.colegio.DTO.CourseGroupDto(g.id.value.toString(), g.nombre, g.tutor.id.value.toString(), assignmentsMap)
            }
            val elapsedBaselineMs = (System.nanoTime() - startTimeBaseline) / 1_000_000.0

            // 2. Enfoque Optimizado (Batch Fetching)
            val startTimeOptimized = System.nanoTime()
            val courseGroupsOptimized = GruposEntity.find { com.colegio.modelos.tables.GruposTable.curso eq curso.id }.toList()
            val groupIds = courseGroupsOptimized.map { it.id }
            val repartosByGroup = if (groupIds.isNotEmpty()) {
                RepartoDocenteTable.selectAll().where { RepartoDocenteTable.grupoId inList groupIds }
                    .groupBy { it[RepartoDocenteTable.grupoId].value.toString() }
            } else {
                emptyMap()
            }
            val groupDtosOptimized = courseGroupsOptimized.map { g ->
                val groupIdStr = g.id.value.toString()
                val repartos = repartosByGroup[groupIdStr] ?: emptyList()
                val assignmentsMap = mutableMapOf<String, String>()
                repartos.forEach { row ->
                    val subId = row[RepartoDocenteTable.asignaturaId].value.toString()
                    val profId = row[RepartoDocenteTable.profesorId]?.value?.toString() ?: ""
                    if (profId.isNotEmpty()) assignmentsMap[subId] = profId
                }
                com.colegio.DTO.CourseGroupDto(groupIdStr, g.nombre, g.tutor.id.value.toString(), assignmentsMap)
            }
            val elapsedOptimizedMs = (System.nanoTime() - startTimeOptimized) / 1_000_000.0

            println("Group Assignments Retrieval Baseline (N+1 queries, 50 groups): ${elapsedBaselineMs} ms")
            println("Group Assignments Retrieval Optimized (Batch query, 50 groups): ${elapsedOptimizedMs} ms")

            assertEquals(groupCount, groupDtosOptimized.size)
            assertEquals(1, groupDtosOptimized.first().assignments?.size)
            assertEquals(prof.id.value.toString(), groupDtosOptimized.first().assignments?.get(asig.id.value.toString()))
            assertEquals(groupDtosBaseline.size, groupDtosOptimized.size)
        }
    }

    @Test
    fun `test group assignments retrieval edge case with empty groups or null assignments`() {
        transaction {
            val curso = CursosEntity.new { nombre = "2º Bachillerato" }
            val subjectsList = AsignaturaEntity.find { com.colegio.modelos.tables.AsignaturaTable.curso eq curso.id }.map { it.id.value.toString() }
            val courseGroups = GruposEntity.find { com.colegio.modelos.tables.GruposTable.curso eq curso.id }.toList()
            val groupIds = courseGroups.map { it.id }
            val repartosByGroup = if (groupIds.isNotEmpty()) {
                RepartoDocenteTable.selectAll().where { RepartoDocenteTable.grupoId inList groupIds }
                    .groupBy { it[RepartoDocenteTable.grupoId].value.toString() }
            } else {
                emptyMap()
            }

            val groupDtos = courseGroups.map { g ->
                val groupIdStr = g.id.value.toString()
                val repartos = repartosByGroup[groupIdStr] ?: emptyList()
                val assignmentsMap = mutableMapOf<String, String>()
                repartos.forEach { row ->
                    val subId = row[RepartoDocenteTable.asignaturaId].value.toString()
                    val profId = row[RepartoDocenteTable.profesorId]?.value?.toString() ?: ""
                    if (profId.isNotEmpty()) assignmentsMap[subId] = profId
                }
                com.colegio.DTO.CourseGroupDto(groupIdStr, g.nombre, g.tutor.id.value.toString(), assignmentsMap)
            }

            assertEquals(0, subjectsList.size)
            assertEquals(0, groupDtos.size)
        }
    }
}
