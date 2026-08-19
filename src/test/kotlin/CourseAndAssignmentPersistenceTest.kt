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
import kotlin.test.BeforeTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotNull

class CourseAndAssignmentPersistenceTest {

    @BeforeTest
    fun setup() {
        val tempDb = File(System.getProperty("java.io.tmpdir"), "test_course_assignments.db")
        if (tempDb.exists()) tempDb.delete()
        System.setProperty("eduschedule.db.path", tempDb.absolutePath)
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
}
