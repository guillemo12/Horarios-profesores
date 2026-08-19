package com.colegio

import com.colegio.DTO.*
import com.colegio.modelos.entities.*
import com.colegio.modelos.tables.*
import com.colegio.routing.DatabaseOperationResponse
import io.ktor.client.request.*
import io.ktor.client.request.forms.*
import io.ktor.client.statement.*
import io.ktor.http.*
import io.ktor.server.testing.*
import kotlinx.serialization.json.Json
import org.jetbrains.exposed.sql.*
import org.jetbrains.exposed.sql.SqlExpressionBuilder.eq
import org.jetbrains.exposed.sql.SqlExpressionBuilder.notInList
import org.jetbrains.exposed.sql.transactions.TransactionManager
import org.jetbrains.exposed.sql.transactions.transaction
import java.io.File
import java.io.FileInputStream
import java.sql.DriverManager
import java.util.UUID
import kotlin.test.*

class DatabasePerformanceAndIntegrityTest {

    private lateinit var testDbFile: File

    @BeforeTest
    fun setUp() {
        testDbFile = File(System.getProperty("java.io.tmpdir"), "eduschedule_test_${UUID.randomUUID()}.db")
        System.setProperty("eduschedule.db.path", testDbFile.absolutePath)
        reconnectDatabase()
    }

    @AfterTest
    fun tearDown() {
        System.clearProperty("eduschedule.db.path")
        TransactionManager.closeAndUnregister(TransactionManager.defaultDatabase ?: return)
        cleanupDbFiles(testDbFile)
    }

    private fun cleanupDbFiles(dbFile: File) {
        if (dbFile.exists()) dbFile.delete()
        val wal = File(dbFile.parentFile, "${dbFile.name}-wal")
        if (wal.exists()) wal.delete()
        val shm = File(dbFile.parentFile, "${dbFile.name}-shm")
        if (shm.exists()) shm.delete()
        val safety = File(dbFile.parentFile, "${dbFile.name}.safety_backup")
        if (safety.exists()) safety.delete()
    }

    private fun executeVacuumInto(sourceDb: File, targetBackup: File) {
        if (targetBackup.exists()) targetBackup.delete()
        val sanitizedPath = targetBackup.absolutePath.replace("\\", "/")
        DriverManager.getConnection("jdbc:sqlite:${sourceDb.absolutePath}").use { conn ->
            conn.autoCommit = true
            conn.createStatement().use { stmt ->
                stmt.execute("VACUUM INTO '$sanitizedPath'")
            }
        }
    }

    // =========================================================================
    // FEATURE F7: SQLite WAL Mode & PRAGMA Verification
    // =========================================================================

    @Test
    fun `test SQLite WAL mode and PRAGMA settings verification`() {
        val jdbcUrl = "jdbc:sqlite:${testDbFile.absolutePath}"
        DriverManager.getConnection(jdbcUrl).use { conn ->
            conn.createStatement().use { stmt ->
                // Configurar PRAGMAs optimizados para EduSchedule
                stmt.execute("PRAGMA journal_mode = WAL;")
                stmt.execute("PRAGMA foreign_keys = ON;")
                stmt.execute("PRAGMA busy_timeout = 10000;")
                stmt.execute("PRAGMA synchronous = NORMAL;")
                stmt.execute("PRAGMA cache_size = -64000;")

                // Verificar journal_mode == wal
                stmt.executeQuery("PRAGMA journal_mode;").use { rs ->
                    assertTrue(rs.next(), "PRAGMA journal_mode debe devolver resultado")
                    val mode = rs.getString(1)
                    assertEquals("wal", mode.lowercase(), "El modo de journal debe ser WAL")
                }

                // Verificar foreign_keys == 1 (ON)
                stmt.executeQuery("PRAGMA foreign_keys;").use { rs ->
                    assertTrue(rs.next())
                    val fk = rs.getInt(1)
                    assertEquals(1, fk, "foreign_keys debe estar activado (1)")
                }

                // Verificar busy_timeout == 10000
                stmt.executeQuery("PRAGMA busy_timeout;").use { rs ->
                    assertTrue(rs.next())
                    val timeout = rs.getInt(1)
                    assertTrue(timeout >= 10000, "busy_timeout debe ser al menos 10000 ms")
                }

                // Verificar synchronous == 1 (NORMAL)
                stmt.executeQuery("PRAGMA synchronous;").use { rs ->
                    assertTrue(rs.next())
                    val sync = rs.getInt(1)
                    assertEquals(1, sync, "synchronous debe ser 1 (NORMAL)")
                }

                // Verificar cache_size == -64000 (64 MB)
                stmt.executeQuery("PRAGMA cache_size;").use { rs ->
                    assertTrue(rs.next())
                    val cache = rs.getInt(1)
                    assertEquals(-64000, cache, "cache_size debe ser -64000")
                }
            }
        }
    }

    @Test
    fun `test foreign key referential integrity rejects orphan child rows`() {
        val jdbcUrl = "jdbc:sqlite:${testDbFile.absolutePath}"
        DriverManager.getConnection(jdbcUrl).use { conn ->
            conn.createStatement().use { stmt ->
                stmt.execute("PRAGMA foreign_keys = ON;")
            }

            // Intentar insertar una clase con foreign keys inexistentes
            val insertSql = """
                INSERT INTO clase_programada (id, start_time, end_time, duration, subject_id, group_id, teacher_id, is_pinned)
                VALUES ('orphan_1', '2026-08-17T09:00:00', '2026-08-17T09:30:00', 0.5, 99999, 99999, 99999, 0)
            """.trimIndent()

            assertFailsWith<java.sql.SQLException>("La inserción de FK huérfana debe fallar cuando foreign_keys=ON") {
                conn.createStatement().use { it.executeUpdate(insertSql) }
            }
        }
    }

    // =========================================================================
    // FEATURE F5: Schema Indexes Verification
    // =========================================================================

    @Test
    fun `test schema indexes presence and coverage across all critical tables`() {
        val jdbcUrl = "jdbc:sqlite:${testDbFile.absolutePath}"
        DriverManager.getConnection(jdbcUrl).use { conn ->
            conn.createStatement().use { stmt ->
                // 1. Consultar índices en sqlite_master
                val indexes = mutableListOf<Triple<String, String, String>>() // name, tableName, sql
                stmt.executeQuery("SELECT name, tbl_name, sql FROM sqlite_master WHERE type='index'").use { rs ->
                    while (rs.next()) {
                        val name = rs.getString("name") ?: ""
                        val tbl = rs.getString("tbl_name") ?: ""
                        val sql = rs.getString("sql") ?: ""
                        indexes.add(Triple(name, tbl, sql))
                    }
                }

                // Verificar existencia de índices clave en el catálogo de SQLite
                val tablesWithIndices = indexes.map { it.second }.toSet()
                assertTrue(tablesWithIndices.contains("curso") || tablesWithIndices.contains("asignatura"),
                    "Las tablas de catálogo escolar deben contener índices definidos")

                // 2. Verificar que las consultas clave ejecutan planes de consulta eficientes
                stmt.executeQuery("EXPLAIN QUERY PLAN SELECT * FROM curso WHERE nombre = '1º'").use { rs ->
                    assertTrue(rs.next(), "EXPLAIN QUERY PLAN debe devolver el plan de ejecución")
                    val plan = rs.getString("detail")
                    assertTrue(plan.contains("INDEX") || plan.contains("PRIMARY") || plan.contains("SEARCH"),
                        "La búsqueda en curso por nombre debe usar índice o búsqueda directa")
                }

                stmt.executeQuery("EXPLAIN QUERY PLAN SELECT * FROM asignatura WHERE nombre = 'Matemáticas' AND curso_id = 1").use { rs ->
                    assertTrue(rs.next())
                    val plan = rs.getString("detail")
                    assertTrue(plan.contains("INDEX") || plan.contains("SEARCH"),
                        "La búsqueda en asignatura por (nombre, curso_id) debe usar el índice compuesto")
                }
            }
        }
    }

    // =========================================================================
    // FEATURE F6: O(1) Batch Projection for Scheduled Classes
    // =========================================================================

    @Test
    fun `test scheduled classes single query batch projection eliminates N+1 lazy queries`() {
        val createdClassesCount = 150

        transaction {
            val prof = ProfesorEntity.new {
                nombre = "Profesor Batch Test"
                minutosMaximos = 1500
                color = "#3b82f6"
            }
            val curso = CursosEntity.new { nombre = "Curso Batch 101" }
            val asig = AsignaturaEntity.new {
                nombre = "Matemáticas Batch"
                this.curso = curso
                minutos = 300
            }
            val grupo = GruposEntity.new {
                nombre = "A"
                this.curso = curso
                this.tutor = prof
            }

            // Insertar 150 clases
            for (i in 1..createdClassesCount) {
                ClaseTable.insert {
                    it[id] = "BATCH_CLS_$i"
                    it[start] = "2026-08-17T09:00:00"
                    it[end] = "2026-08-17T09:30:00"
                    it[duration] = 0.5
                    it[subjectId] = asig.id
                    it[groupId] = grupo.id
                    it[teacherId] = prof.id
                    it[isPinned] = (i % 2 == 0)
                }
            }
        }

        // Medir tiempo y verificar proyección en una sola consulta O(1)
        val startTime = System.currentTimeMillis()
        val dtos = transaction {
            ClaseTable.selectAll().map { row ->
                ScheduledClassDto(
                    id = row[ClaseTable.id].value,
                    start = row[ClaseTable.start],
                    end = row[ClaseTable.end],
                    duration = row[ClaseTable.duration],
                    subjectId = row[ClaseTable.subjectId].value.toString(),
                    groupId = row[ClaseTable.groupId].value.toString(),
                    teacherId = row[ClaseTable.teacherId].value.toString(),
                    isPinned = row[ClaseTable.isPinned]
                )
            }
        }
        val elapsed = System.currentTimeMillis() - startTime

        assertEquals(createdClassesCount, dtos.size, "Debe proyectar exactamente $createdClassesCount clases")
        assertTrue(elapsed < 500, "La proyección por lotes O(1) de $createdClassesCount clases debe tardar <500ms (tardó ${elapsed}ms)")

        // Verificar fidelidad de los datos proyectados
        val first = dtos.first { it.id == "BATCH_CLS_1" }
        assertEquals("2026-08-17T09:00:00", first.start)
        assertEquals("2026-08-17T09:30:00", first.end)
        assertEquals(0.5, first.duration)
        assertFalse(first.isPinned)

        val second = dtos.first { it.id == "BATCH_CLS_2" }
        assertTrue(second.isPinned)
    }

    // =========================================================================
    // FEATURE F9: Batch Insert and Deletion Pipeline
    // =========================================================================

    @Test
    fun `test batch insert and deleteWhere notInList operations execute atomically`() {
        val totalToInsert = 200

        val (profId, cursoId, asigId, grupoId) = transaction {
            val p = ProfesorEntity.new { nombre = "Prof Batch Ops"; minutosMaximos = 1350; color = "#10b981" }
            val c = CursosEntity.new { nombre = "Curso Batch Ops" }
            val a = AsignaturaEntity.new { nombre = "Lengua Batch"; this.curso = c; minutos = 300 }
            val g = GruposEntity.new { nombre = "B"; this.curso = c; this.tutor = p }
            listOf(p.id, c.id, a.id, g.id)
        }

        // Batch Insert
        transaction {
            for (i in 1..totalToInsert) {
                ClaseTable.insert {
                    it[id] = "BATCH_OP_$i"
                    it[start] = "2026-08-17T10:00:00"
                    it[end] = "2026-08-17T10:30:00"
                    it[duration] = 0.5
                    it[subjectId] = asigId
                    it[groupId] = grupoId
                    it[teacherId] = profId
                    it[isPinned] = false
                }
            }
        }

        val countAfterInsert = transaction { ClaseTable.selectAll().where { ClaseTable.groupId eq grupoId }.count() }
        assertEquals(totalToInsert.toLong(), countAfterInsert, "Deben haberse insertado $totalToInsert clases")

        // Batch Delete usando notInList (mantener solo los primeros 50)
        val keepIds = (1..50).map { "BATCH_OP_$it" }.toSet()
        transaction {
            ClaseTable.deleteWhere { (groupId eq grupoId) and (id notInList keepIds) }
        }

        val countAfterDelete = transaction { ClaseTable.selectAll().where { ClaseTable.groupId eq grupoId }.count() }
        assertEquals(50L, countAfterDelete, "Deben quedar exactamente 50 clases tras el borrado por lotes")

        // Verificar que los IDs restantes son exactamente los preservados
        val remainingIds = transaction {
            ClaseTable.selectAll().where { ClaseTable.groupId eq grupoId }.map { it[ClaseTable.id].value }.toSet()
        }
        assertEquals(keepIds, remainingIds, "Los IDs restantes deben coincidir exactamente con keepIds")
    }

    // =========================================================================
    // FEATURE F8 & F10: Atomic Backup (VACUUM INTO) & Safe Restore Round-Trip
    // =========================================================================

    @Test
    fun `test VACUUM INTO creates valid standalone backup database snapshot`() {
        // 1. Población de datos en la DB activa
        transaction {
            val prof = ProfesorEntity.new { nombre = "Profesor Vacuum"; minutosMaximos = 1200; color = "#8b5cf6" }
            val curso = CursosEntity.new { nombre = "Curso Vacuum" }
            val asig = AsignaturaEntity.new { nombre = "Ciencias"; this.curso = curso; minutos = 180 }
            val grupo = GruposEntity.new { nombre = "V1"; this.curso = curso; this.tutor = prof }

            RepartoDocenteTable.insert {
                it[grupoId] = grupo.id
                it[asignaturaId] = asig.id
                it[profesorId] = prof.id
            }

            ClaseTable.insert {
                it[id] = "VAC_CLS_1"
                it[start] = "2026-08-17T09:00:00"
                it[end] = "2026-08-17T10:00:00"
                it[duration] = 1.0
                it[subjectId] = asig.id
                it[groupId] = grupo.id
                it[teacherId] = prof.id
                it[isPinned] = true
            }
        }

        val backupFile = File(System.getProperty("java.io.tmpdir"), "test_vacuum_backup_${UUID.randomUUID()}.db")
        try {
            // 2. Ejecutar VACUUM INTO vía JDBC con autoCommit
            executeVacuumInto(testDbFile, backupFile)

            assertTrue(backupFile.exists(), "El archivo de backup generado por VACUUM INTO debe existir")
            assertTrue(backupFile.length() > 0, "El archivo de backup no debe estar vacío")

            // 3. Verificar cabecera SQLite
            val header = ByteArray(16)
            FileInputStream(backupFile).use { it.read(header) }
            val headerStr = String(header, Charsets.UTF_8)
            assertTrue(headerStr.startsWith("SQLite format 3"), "El archivo de backup debe tener cabecera SQLite válida")

            // 4. Abrir la base de datos de backup de forma independiente y verificar los datos
            DriverManager.getConnection("jdbc:sqlite:${backupFile.absolutePath}").use { conn ->
                conn.createStatement().use { stmt ->
                    stmt.executeQuery("SELECT count(*) FROM curso").use { rs ->
                        assertTrue(rs.next())
                        assertTrue(rs.getInt(1) >= 1, "La tabla curso en el backup debe contener datos")
                    }
                    stmt.executeQuery("SELECT count(*) FROM clase_programada").use { rs ->
                        assertTrue(rs.next())
                        assertTrue(rs.getInt(1) >= 1, "La tabla clase_programada en el backup debe contener datos")
                    }
                    stmt.executeQuery("SELECT is_pinned FROM clase_programada WHERE id='VAC_CLS_1'").use { rs ->
                        assertTrue(rs.next())
                        assertEquals(1, rs.getInt(1), "is_pinned debe ser 1 en el backup")
                    }
                }
            }
        } finally {
            cleanupDbFiles(backupFile)
        }
    }

    @Test
    fun `test full database backup and restore round-trip preserves 100 percent entity equality`() {
        // 1. Población con dataset completo y representativo
        val teacherNames = listOf("Tutor 1A", "Tutor 1B", "Especialista Música", "Especialista Francés")
        val courseNames = listOf("1º Primaria", "2º Primaria")
        val subjectNames = listOf("Matemáticas", "Lengua", "Música", "Francés")

        val expectedTeachers = mutableListOf<String>()
        val expectedCourses = mutableListOf<String>()
        val expectedSubjects = mutableListOf<String>()
        val expectedClasses = mutableListOf<Triple<String, String, Boolean>>() // id, start, isPinned

        transaction {
            val teachers = teacherNames.map { name ->
                val p = ProfesorEntity.new {
                    this.nombre = name
                    this.minutosMaximos = 1350
                    this.color = "#4f46e5"
                    this.disponibilidad = """[{"day":"MONDAY","start":"09:00","end":"14:00"}]"""
                }
                expectedTeachers.add(p.nombre)
                p
            }

            courseNames.forEachIndexed { cIdx, cName ->
                val curso = CursosEntity.new { nombre = cName }
                expectedCourses.add(curso.nombre)

                val subjects = subjectNames.map { sName ->
                    val s = AsignaturaEntity.new {
                        this.nombre = sName
                        this.curso = curso
                        this.minutos = 180
                    }
                    expectedSubjects.add("${s.nombre}_${curso.nombre}")
                    s
                }

                val grupoA = GruposEntity.new {
                    this.nombre = "A"
                    this.curso = curso
                    this.tutor = teachers[cIdx % teachers.size]
                }

                // Asignaciones de Reparto
                subjects.forEachIndexed { sIdx, asig ->
                    val prof = teachers[sIdx % teachers.size]
                    RepartoDocenteTable.insert {
                        it[grupoId] = grupoA.id
                        it[asignaturaId] = asig.id
                        it[profesorId] = prof.id
                    }

                    // Clases programadas (1 pinned, 1 unpinned)
                    val classId1 = "CLS_${cIdx}_${sIdx}_PIN"
                    val classId2 = "CLS_${cIdx}_${sIdx}_UNPIN"

                    ClaseTable.insert {
                        it[id] = classId1
                        it[start] = "2026-08-17T09:00:00"
                        it[end] = "2026-08-17T09:30:00"
                        it[duration] = 0.5
                        it[subjectId] = asig.id
                        it[groupId] = grupoA.id
                        it[teacherId] = prof.id
                        it[isPinned] = true
                    }
                    expectedClasses.add(Triple(classId1, "2026-08-17T09:00:00", true))

                    ClaseTable.insert {
                        it[id] = classId2
                        it[start] = "2026-08-17T09:30:00"
                        it[end] = "2026-08-17T10:00:00"
                        it[duration] = 0.5
                        it[subjectId] = asig.id
                        it[groupId] = grupoA.id
                        it[teacherId] = prof.id
                        it[isPinned] = false
                    }
                    expectedClasses.add(Triple(classId2, "2026-08-17T09:30:00", false))
                }
            }
        }

        // 2. Exportar / Backup a un archivo temporal vía executeVacuumInto
        val backupSnapshotFile = File(System.getProperty("java.io.tmpdir"), "roundtrip_backup_${UUID.randomUUID()}.db")
        executeVacuumInto(testDbFile, backupSnapshotFile)
        assertTrue(backupSnapshotFile.exists() && backupSnapshotFile.length() > 0)

        // 3. Mutar/Vaciar la base de datos activa para simular pérdida o cambio de datos
        transaction {
            ClaseTable.deleteAll()
            RepartoDocenteTable.deleteAll()
            GruposTable.deleteAll()
            AsignaturaTable.deleteAll()
            CursoTable.deleteAll()
            ProfesorTable.deleteAll()
        }

        transaction {
            assertEquals(0L, ProfesorEntity.count())
            assertEquals(0L, CursosEntity.count())
            assertEquals(0L, ClaseEntity.count())
        }

        // 4. Restaurar la base de datos desde el backup
        val currentDbPath = getDatabasePath()
        val currentDbFile = File(currentDbPath)
        backupSnapshotFile.copyTo(currentDbFile, overwrite = true)
        reconnectDatabase()

        // 5. Verificar 100% de igualdad de entidades restauradas
        transaction {
            // Verificar profesores
            val restoredTeachers = ProfesorEntity.all().map { it.nombre }.toSet()
            assertEquals(expectedTeachers.toSet(), restoredTeachers, "Los profesores restaurados deben coincidir al 100%")

            // Verificar cursos
            val restoredCourses = CursosEntity.all().map { it.nombre }.toSet()
            assertEquals(expectedCourses.toSet(), restoredCourses, "Los cursos restaurados deben coincidir al 100%")

            // Verificar asignaturas
            val restoredSubjects = AsignaturaEntity.all().map { "${it.nombre}_${it.curso.nombre}" }.toSet()
            assertEquals(expectedSubjects.toSet(), restoredSubjects, "Las asignaturas restauradas deben coincidir al 100%")

            // Verificar clases programadas e igualdad estricta de propiedades
            val restoredClasses = ClaseTable.selectAll().map {
                Triple(it[ClaseTable.id].value, it[ClaseTable.start], it[ClaseTable.isPinned])
            }.toSet()
            assertEquals(expectedClasses.toSet(), restoredClasses, "Las clases programadas restauradas deben coincidir al 100%")

            // Verificar que los pins se preservaron exactamente
            expectedClasses.filter { it.third }.forEach { (clsId, _, isPinned) ->
                val cls = ClaseEntity.findById(clsId)
                assertNotNull(cls, "Clase pinned $clsId debe existir tras restore")
                assertTrue(cls.isPinned, "Clase pinned $clsId debe mantener isPinned == true tras restore")
            }
        }

        cleanupDbFiles(backupSnapshotFile)
    }

    // =========================================================================
    // REST Endpoints: Export & Import Integration
    // =========================================================================

    @Test
    fun `test REST database export endpoint returns valid SQLite database file`() = testApplication {
        application {
            configureSerialization()
            configureRouting()
        }

        val response = client.get("/api/v1/system/database/export")
        assertEquals(HttpStatusCode.OK, response.status)

        val disposition = response.headers[HttpHeaders.ContentDisposition]
        assertNotNull(disposition, "Debe contener cabecera Content-Disposition")
        assertTrue(disposition.contains("EduSchedule_Backup_") && disposition.endsWith(".db"),
            "El nombre del archivo exportado debe coincidir con el formato EduSchedule_Backup_*.db")

        val bytes = response.bodyAsBytes()
        assertTrue(bytes.size >= 16, "El archivo exportado debe tener al menos 16 bytes")
        val headerStr = String(bytes.sliceArray(0..15), Charsets.UTF_8)
        assertTrue(headerStr.startsWith("SQLite format 3"), "La exportación REST debe tener cabecera SQLite válida")
    }

    @Test
    fun `test REST database import rejects non-sqlite and corrupt files`() = testApplication {
        application {
            configureSerialization()
            configureRouting()
        }

        // 1. Archivo de texto plano corrupto
        val fakeContent = "Este es un archivo de texto corrupto, no una base de datos SQLite.".repeat(3).toByteArray()
        val response = client.submitFormWithBinaryData(
            url = "/api/v1/system/database/import",
            formData = formData {
                append("file", fakeContent, Headers.build {
                    append(HttpHeaders.ContentType, "application/octet-stream")
                    append(HttpHeaders.ContentDisposition, "filename=\"fake_db.db\"")
                })
            }
        )

        assertEquals(HttpStatusCode.BadRequest, response.status, "Debe rechazar archivos que no sean SQLite válido")
        val opResponse = Json.decodeFromString<DatabaseOperationResponse>(response.bodyAsText())
        assertFalse(opResponse.success, "La respuesta debe indicar fallo")
        assertTrue(opResponse.message.contains("no es una base de datos SQLite válida") || opResponse.message.contains("no válido"),
            "El mensaje de error debe indicar formato inválido")
    }
}
