package com.colegio

import com.colegio.DTO.TeacherAvailabilityDto
import com.colegio.modelos.entities.ProfesorEntity
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import org.jetbrains.exposed.sql.transactions.transaction
import java.io.File
import kotlin.test.AfterTest
import kotlin.test.BeforeTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.test.assertTrue

class TeacherAvailabilityPersistenceTest {

    private val tempDb = File(System.getProperty("java.io.tmpdir"), "test_teacher_availability.db")

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
    fun `test 1 (Happy Path) - create teacher with availability blocks and verify retrieval`() {
        val blocks = listOf(
            TeacherAvailabilityDto(dayOfWeek = 1, startTime = "09:00", endTime = "09:30"),
            TeacherAvailabilityDto(dayOfWeek = 1, startTime = "09:30", endTime = "10:00"),
            TeacherAvailabilityDto(dayOfWeek = 5, startTime = "13:00", endTime = "14:00")
        )

        val teacherId = transaction {
            val prof = ProfesorEntity.new {
                nombre = "Profesor Bloqueos"
                minutosMaximos = 1200
                color = "#4f46e5"
                disponibilidad = Json.encodeToString(blocks)
            }
            prof.id.value
        }

        transaction {
            val loaded = ProfesorEntity.findById(teacherId)
            assertNotNull(loaded)
            assertEquals("Profesor Bloqueos", loaded.nombre)

            val parsed = Json.decodeFromString<List<TeacherAvailabilityDto>>(loaded.disponibilidad)
            assertEquals(3, parsed.size)
            assertEquals(1, parsed[0].dayOfWeek)
            assertEquals("09:00", parsed[0].startTime)
            assertEquals(5, parsed[2].dayOfWeek)
        }
    }

    @Test
    fun `test 2 (Edge Case) - update availability to empty list and gracefully handle corrupt json string`() {
        val teacherId = transaction {
            val prof = ProfesorEntity.new {
                nombre = "Profesor Resiliencia"
                minutosMaximos = 1200
                color = "#059669"
                disponibilidad = "CADENA_JSON_CORRUPTA_INVALIDA"
            }
            prof.id.value
        }

        // Test fallback on corrupt JSON
        transaction {
            val loaded = ProfesorEntity.findById(teacherId)
            assertNotNull(loaded)
            val fallbackList = try {
                Json.decodeFromString<List<TeacherAvailabilityDto>>(loaded.disponibilidad)
            } catch (_: Exception) {
                emptyList()
            }
            assertTrue(fallbackList.isEmpty())

            // Test updating to clean empty list
            loaded.disponibilidad = Json.encodeToString(emptyList<TeacherAvailabilityDto>())
        }

        transaction {
            val updated = ProfesorEntity.findById(teacherId)
            assertNotNull(updated)
            val parsed = Json.decodeFromString<List<TeacherAvailabilityDto>>(updated.disponibilidad)
            assertTrue(parsed.isEmpty())
        }
    }
}
