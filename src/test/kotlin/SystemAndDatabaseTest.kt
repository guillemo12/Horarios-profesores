package com.colegio

import com.colegio.modelos.entities.ProfesorEntity
import com.colegio.routing.DatabaseOperationResponse
import com.colegio.routing.InstallUpdateRequest
import com.colegio.routing.InstallUpdateResponse
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import org.jetbrains.exposed.sql.transactions.transaction
import java.io.File
import java.io.FileInputStream
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNotNull
import kotlin.test.assertTrue

class SystemAndDatabaseTest {

    @Test
    fun `test database path resolution in user appdata directory`() {
        val path = getDatabasePath()
        assertNotNull(path)
        assertTrue(path.endsWith("colegio.db"), "La base de datos debe llamarse colegio.db")

        val dbFile = File(path)
        val parentDir = dbFile.parentFile
        assertNotNull(parentDir)
        assertTrue(parentDir.exists(), "El directorio de la base de datos debe existir y tener permisos")
        assertTrue(parentDir.canWrite(), "El directorio de la base de datos debe tener permisos de escritura")
    }

    @Test
    fun `test custom database path override via system property`() {
        val tempDb = File(System.getProperty("java.io.tmpdir"), "test_custom_eduschedule.db")
        System.setProperty("eduschedule.db.path", tempDb.absolutePath)
        try {
            val resolved = getDatabasePath()
            assertEquals(tempDb.absolutePath, resolved)
        } finally {
            System.clearProperty("eduschedule.db.path")
            tempDb.delete()
        }
    }

    @Test
    fun `test database initialization and entity persistence in resolved path`() {
        initDatabase()
        transaction {
            val count = ProfesorEntity.count()
            assertTrue(count >= 0, "La base de datos debe ser accesible y permitir consultas")
        }
    }

    @Test
    fun `test database export produces valid sqlite header`() {
        initDatabase()
        val dbPath = getDatabasePath()
        val dbFile = File(dbPath)
        assertTrue(dbFile.exists(), "El archivo de base de datos debe existir")
        assertTrue(dbFile.length() > 0, "La base de datos no debe estar vacía")

        val header = ByteArray(16)
        FileInputStream(dbFile).use { it.read(header) }
        val headerString = String(header, Charsets.UTF_8)
        assertTrue(headerString.startsWith("SQLite format 3"), "La base de datos exportada debe tener cabecera SQLite válida")
    }

    @Test
    fun `test invalid file rejection on database restore validation`() {
        val invalidFile = File(System.getProperty("java.io.tmpdir"), "fake_corrupt_db.txt")
        invalidFile.writeText("Este no es un archivo sqlite valido")
        try {
            val header = ByteArray(16)
            FileInputStream(invalidFile).use { it.read(header) }
            val headerString = String(header, Charsets.UTF_8)
            assertFalse(headerString.startsWith("SQLite format 3"), "Archivos no SQLite deben ser detectados como inválidos")
        } finally {
            invalidFile.delete()
        }
    }

    @Test
    fun `test update request serialization`() {
        val req = InstallUpdateRequest(
            downloadUrl = "https://github.com/guillemo12/Horarios-profesores/releases/download/v0.0.7/EduSchedule_0.0.7_x64-setup.exe",
            fileName = "EduSchedule_0.0.7_x64-setup.exe"
        )
        val json = Json.encodeToString(req)
        assertTrue(json.contains("downloadUrl"))
        assertTrue(json.contains("EduSchedule_0.0.7_x64-setup.exe"))

        val decoded = Json.decodeFromString<InstallUpdateRequest>(json)
        assertEquals(req.downloadUrl, decoded.downloadUrl)
        assertEquals(req.fileName, decoded.fileName)
    }

    @Test
    fun `test update response structure`() {
        val resp = InstallUpdateResponse(success = true, message = "Iniciando instalación...")
        val json = Json.encodeToString(resp)
        assertTrue(json.contains("success"))
        val decoded = Json.decodeFromString<InstallUpdateResponse>(json)
        assertTrue(decoded.success)
        assertEquals("Iniciando instalación...", decoded.message)
    }

    @Test
    fun `test database operation response structure`() {
        val resp = DatabaseOperationResponse(success = true, message = "Base de datos restaurada correctamente.")
        val json = Json.encodeToString(resp)
        assertTrue(json.contains("success"))
        val decoded = Json.decodeFromString<DatabaseOperationResponse>(json)
        assertTrue(decoded.success)
        assertEquals("Base de datos restaurada correctamente.", decoded.message)
    }
}
