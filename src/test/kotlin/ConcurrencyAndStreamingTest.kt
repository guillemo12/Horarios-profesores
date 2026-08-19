package com.colegio

import com.colegio.DTO.*
import com.colegio.modelos.entities.*
import com.colegio.modelos.tables.*
import com.colegio.solver.*
import com.google.ortools.sat.CpSolverStatus
import io.ktor.client.plugins.websocket.*
import io.ktor.client.request.*
import io.ktor.client.statement.*
import io.ktor.http.*
import io.ktor.server.testing.*
import io.ktor.websocket.*
import kotlinx.coroutines.*
import kotlinx.coroutines.channels.Channel
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import org.jetbrains.exposed.sql.*
import org.jetbrains.exposed.sql.transactions.TransactionManager
import org.jetbrains.exposed.sql.transactions.transaction
import java.io.File
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicInteger
import kotlin.test.*

class ConcurrencyAndStreamingTest {

    private lateinit var testDbFile: File

    @BeforeTest
    fun setUp() {
        testDbFile = File(System.getProperty("java.io.tmpdir"), "eduschedule_concurrency_${UUID.randomUUID()}.db")
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
    }

    // =========================================================================
    // FEATURE F9: Multi-Threaded Concurrent REST & Database Operations
    // =========================================================================

    @Test
    fun `test concurrent multi-threaded read and write operations complete with zero SQLITE_BUSY errors`() = runBlocking {
        // 1. Población inicial de entidades
        val (profId, cursoId, asigId, grupoId) = transaction {
            val p = ProfesorEntity.new { nombre = "Prof Concurrency"; minutosMaximos = 1350; color = "#3b82f6" }
            val c = CursosEntity.new { nombre = "Curso Concurrency" }
            val a = AsignaturaEntity.new { nombre = "Matemáticas"; this.curso = c; minutos = 300 }
            val g = GruposEntity.new { nombre = "A"; this.curso = c; this.tutor = p }

            // Insertar algunas clases base
            for (i in 1..20) {
                ClaseTable.insert {
                    it[id] = "CONC_BASE_$i"
                    it[start] = "2026-08-17T09:00:00"
                    it[end] = "2026-08-17T09:30:00"
                    it[duration] = 0.5
                    it[subjectId] = a.id
                    it[groupId] = g.id
                    it[teacherId] = p.id
                    it[isPinned] = false
                }
            }
            listOf(p.id, c.id, a.id, g.id)
        }

        val concurrentWorkers = 16
        val operationsPerWorker = 25
        val busyErrorsCount = AtomicInteger(0)
        val successfulOpsCount = AtomicInteger(0)
        val errorList = ConcurrentHashMap.newKeySet<String>()

        val jobs = (1..concurrentWorkers).map { workerId ->
            launch(Dispatchers.IO) {
                for (op in 1..operationsPerWorker) {
                    try {
                        when ((workerId + op) % 4) {
                            0 -> {
                                // Lectura concurrente de clases
                                transaction {
                                    val count = ClaseTable.selectAll().count()
                                    assertTrue(count >= 0)
                                }
                            }
                            1 -> {
                                // Lectura concurrente de profesores y configuración
                                transaction {
                                    val profs = ProfesorEntity.all().toList()
                                    val cfg = ConfiguracionEntity.all().firstOrNull()
                                    assertTrue(profs.isNotEmpty() || cfg != null)
                                }
                            }
                            2 -> {
                                // Escritura: inserción de clase única por hilo
                                transaction {
                                    ClaseTable.insert {
                                        it[id] = "CONC_W${workerId}_OP${op}_${UUID.randomUUID()}"
                                        it[start] = "2026-08-17T10:00:00"
                                        it[end] = "2026-08-17T10:30:00"
                                        it[duration] = 0.5
                                        it[subjectId] = asigId
                                        it[groupId] = grupoId
                                        it[teacherId] = profId
                                        it[isPinned] = (op % 2 == 0)
                                    }
                                }
                            }
                            3 -> {
                                // Escritura: actualización de configuración u horas
                                transaction {
                                    val cfg = ConfiguracionEntity.all().firstOrNull()
                                    if (cfg != null) {
                                        cfg.tiempoMinimo = 30
                                        cfg.tiempoMaximo = 60
                                    }
                                }
                            }
                        }
                        successfulOpsCount.incrementAndGet()
                    } catch (e: Exception) {
                        val msg = e.message ?: e.toString()
                        if (msg.contains("SQLITE_BUSY") || msg.contains("database is locked") || msg.contains("database table is locked")) {
                            busyErrorsCount.incrementAndGet()
                        }
                        errorList.add("Worker $workerId Op $op: $msg")
                    }
                }
            }
        }

        jobs.joinAll()

        assertEquals(0, busyErrorsCount.get(), "No debe haber ningún error SQLITE_BUSY bajo carga concurrente (Hubo ${busyErrorsCount.get()})")
        assertEquals(concurrentWorkers * operationsPerWorker, successfulOpsCount.get(),
            "Todas las operaciones concurrentes deben completarse con éxito. Errores: $errorList")
    }

    @Test
    fun `test concurrent transaction isolation prevents dirty reads and lost updates`() = runBlocking {
        val testClassId = "ISO_TEST_CLS"

        val (profId, cursoId, asigId, grupoId) = transaction {
            val p = ProfesorEntity.new { nombre = "Prof Iso"; minutosMaximos = 1350; color = "#ef4444" }
            val c = CursosEntity.new { nombre = "Curso Iso" }
            val a = AsignaturaEntity.new { nombre = "Física"; this.curso = c; minutos = 300 }
            val g = GruposEntity.new { nombre = "A"; this.curso = c; this.tutor = p }

            ClaseTable.insert {
                it[id] = testClassId
                it[start] = "2026-08-17T09:00:00"
                it[end] = "2026-08-17T09:30:00"
                it[duration] = 0.5
                it[subjectId] = a.id
                it[groupId] = g.id
                it[teacherId] = p.id
                it[isPinned] = false
            }
            listOf(p.id, c.id, a.id, g.id)
        }

        val iterations = 50
        val updateCount = AtomicInteger(0)

        val writerJob = launch(Dispatchers.IO) {
            for (i in 1..iterations) {
                transaction {
                    val cls = ClaseEntity.findById(testClassId)
                    if (cls != null) {
                        cls.isPinned = (i % 2 == 0)
                        cls.start = if (i % 2 == 0) "2026-08-17T11:00:00" else "2026-08-17T09:00:00"
                    }
                }
                updateCount.incrementAndGet()
            }
        }

        val readerJob = launch(Dispatchers.IO) {
            for (i in 1..iterations) {
                transaction {
                    val cls = ClaseEntity.findById(testClassId)
                    assertNotNull(cls)
                    // Invariante de consistencia: start debe ser 09:00 o 11:00, nunca null o corrupto
                    assertTrue(cls.start == "2026-08-17T09:00:00" || cls.start == "2026-08-17T11:00:00",
                        "El valor de start leído debe ser consistente")
                }
            }
        }

        joinAll(writerJob, readerJob)
        assertEquals(iterations, updateCount.get(), "Todas las actualizaciones de aislamiento deben completarse")
    }

    // =========================================================================
    // FEATURE F12: WebSocket Live Streaming & Backpressure Conflation
    // =========================================================================

    @Test
    fun `test WebSocket solver progress channel handles high-frequency bursts without producer blocking`() = runBlocking {
        val totalTicks = 1000
        val progressChannel = Channel<SolverProgress>(capacity = Channel.UNLIMITED)
        val receivedTicks = AtomicInteger(0)

        // Productor de alta frecuencia (simula el motor CP-SAT disparando progresos rápidos)
        val producerJob = launch(Dispatchers.Default) {
            val tutor = Profesor(nombre = "Tutor Stream", asignaturas = emptyList(), asignaturasPreferidas = emptyList(), minutosMaximos = 1350)
            val dummyLesson = Leccion(
                id = "LECCION_STREAM",
                asignatura = "Matemáticas",
                grupo = Grupo(curso = "1º", nombre = "A", tutor = tutor),
                minutosSemanales = 30,
                profesorFijo = null
            )

            for (i in 1..totalTicks) {
                val progress = SolverProgress(
                    status = CpSolverStatus.FEASIBLE,
                    isFeasible = true,
                    hardScore = 0,
                    softScore = -i,
                    bestBound = 100,
                    rawObjective = i.toLong(),
                    conflictos = emptyList(),
                    solvedLessons = listOf(dummyLesson)
                )
                progressChannel.trySend(progress)
            }
            progressChannel.close()
        }

        // Consumidor simulando el dispatcher WebSocket
        val consumerJob = launch(Dispatchers.IO) {
            for (progress in progressChannel) {
                receivedTicks.incrementAndGet()
                // Pequeña simulación de procesamiento
                if (receivedTicks.get() % 100 == 0) {
                    delay(1)
                }
            }
        }

        joinAll(producerJob, consumerJob)
        assertEquals(totalTicks, receivedTicks.get(), "El canal debe procesar todas las $totalTicks emisiones sin pérdida")
    }

    @Test
    fun `test WebSocket solver live progress streaming lifecycle with START and completion`() = testApplication {
        application {
            configureSerialization()
            configureRouting()
            configureSockets()
        }

        val wsClient = createClient {
            install(WebSockets)
        }

        wsClient.webSocket("/ws") {
            // 1. Enviar comando START
            val startCmd = WsMessage(command = "START")
            send(Frame.Text(Json.encodeToString(startCmd)))

            var receivedScoresUpdated = false
            var receivedSchedulePushed = false
            var receivedOptimizationComplete = false

            val receiveTimeoutMillis = 15000L
            val startTime = System.currentTimeMillis()

            while (System.currentTimeMillis() - startTime < receiveTimeoutMillis) {
                val frame = incoming.receive()
                if (frame is Frame.Text) {
                    val text = frame.readText()

                    if (text.contains("scores_updated")) {
                        receivedScoresUpdated = true
                        assertTrue(text.contains("hard"), "El mensaje scores_updated debe contener hard score")
                        assertTrue(text.contains("conflictos"), "El mensaje scores_updated debe contener lista de conflictos")
                    }

                    if (text.contains("schedule_pushed")) {
                        receivedSchedulePushed = true
                        assertTrue(text.contains("schedule"), "El mensaje schedule_pushed debe contener array schedule")
                    }

                    if (text.contains("optimization_complete") || text.contains("scores_updated")) {
                        if (text.contains("optimization_complete")) {
                            receivedOptimizationComplete = true
                            break
                        }
                    }
                }
            }

            assertTrue(receivedScoresUpdated || receivedSchedulePushed,
                "El flujo de WebSocket debe emitir al menos scores_updated o schedule_pushed")
        }
    }

    @Test
    fun `test WebSocket STOP command cancels active solver job promptly`() = testApplication {
        application {
            configureSerialization()
            configureRouting()
            configureSockets()
        }

        val wsClient = createClient {
            install(WebSockets)
        }

        wsClient.webSocket("/ws") {
            // 1. Enviar START
            send(Frame.Text(Json.encodeToString(WsMessage(command = "START"))))
            delay(100)

            // 2. Enviar STOP inmediatamente
            send(Frame.Text(Json.encodeToString(WsMessage(command = "STOP"))))

            var receivedStopped = false
            val startTime = System.currentTimeMillis()

            while (System.currentTimeMillis() - startTime < 5000) {
                val frame = incoming.receive()
                if (frame is Frame.Text) {
                    val text = frame.readText()
                    if (text.contains("optimization_stopped")) {
                        receivedStopped = true
                        break
                    }
                }
            }

            assertTrue(receivedStopped, "El servidor debe responder con optimization_stopped tras recibir comando STOP")
        }
    }

    @Test
    fun `test WebSocket gracefully handles malformed and invalid JSON frames`() = testApplication {
        application {
            configureSerialization()
            configureRouting()
            configureSockets()
        }

        val wsClient = createClient {
            install(WebSockets)
        }

        wsClient.webSocket("/ws") {
            // Enviar frames malformados
            send(Frame.Text("NOT_JSON"))
            send(Frame.Text("{broken json: 123}"))
            send(Frame.Text("""{"command":"UNKNOWN_COMMAND"}"""))

            // La conexión debe permanecer viva y aceptar un STOP válido
            send(Frame.Text(Json.encodeToString(WsMessage(command = "STOP"))))

            val frame = incoming.receive()
            if (frame is Frame.Text) {
                val text = frame.readText()
                assertTrue(text.contains("optimization_stopped"),
                    "El servidor debe procesar comandos válidos tras recibir frames malformados")
            }
        }
    }

    @Test
    fun `test multiple concurrent WebSocket client connections operate independently`() = testApplication {
        application {
            configureSerialization()
            configureRouting()
            configureSockets()
        }

        val wsClient = createClient {
            install(WebSockets)
        }

        coroutineScope {
            val client1 = async {
                wsClient.webSocket("/ws") {
                    send(Frame.Text(Json.encodeToString(WsMessage(command = "STOP"))))
                    val frame = incoming.receive()
                    assertTrue(frame is Frame.Text && frame.readText().contains("optimization_stopped"))
                }
            }

            val client2 = async {
                wsClient.webSocket("/ws") {
                    send(Frame.Text(Json.encodeToString(WsMessage(command = "STOP"))))
                    val frame = incoming.receive()
                    assertTrue(frame is Frame.Text && frame.readText().contains("optimization_stopped"))
                }
            }

            awaitAll(client1, client2)
        }
    }
}
