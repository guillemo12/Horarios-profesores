package com.colegio.database

import java.io.File
import kotlin.test.AfterTest
import kotlin.test.BeforeTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.test.assertTrue

class DatabaseConfigTest {

    private val tempDb = File(System.getProperty("java.io.tmpdir"), "test_db_config.db")

    @BeforeTest
    fun setup() {
        if (tempDb.exists()) tempDb.delete()
        System.setProperty("eduschedule.db.path", tempDb.absolutePath)
    }

    @AfterTest
    fun tearDown() {
        System.clearProperty("eduschedule.db.path")
        if (tempDb.exists()) tempDb.delete()
    }

    // -------------------------------------------------------------
    // 1. getDatabasePath - 2+ Tests
    // -------------------------------------------------------------
    @Test
    fun `getDatabasePath - Happy Path resolves custom JVM system property path`() {
        val path = DatabaseConfig.getDatabasePath()
        assertEquals(tempDb.absolutePath, path)
    }

    @Test
    fun `getDatabasePath - Edge Case falls back to default app directory when system property is empty`() {
        System.clearProperty("eduschedule.db.path")
        val path = DatabaseConfig.getDatabasePath()
        assertNotNull(path)
        assertTrue(path.endsWith("colegio.db"), "Debe terminar en colegio.db")
    }

    // -------------------------------------------------------------
    // 2. connect & reconnectDatabase - 2+ Tests
    // -------------------------------------------------------------
    @Test
    fun `connect - Happy Path establishes database connection and creates tables`() {
        val db = DatabaseConfig.connect(tempDb.absolutePath)
        assertNotNull(db)
        assertTrue(tempDb.exists(), "El archivo de base de datos SQLite debe ser creado")
    }

    @Test
    fun `reconnectDatabase - Edge Case safely reconnects when called multiple times`() {
        DatabaseConfig.reconnectDatabase()
        DatabaseConfig.reconnectDatabase()
        assertTrue(tempDb.exists())
    }
}
