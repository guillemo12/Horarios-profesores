package com.colegio

import io.ktor.client.request.*
import io.ktor.client.statement.*
import io.ktor.http.*
import io.ktor.server.testing.*
import kotlin.test.*
import kotlinx.serialization.json.*
import java.io.File
import org.jetbrains.exposed.sql.Database
import org.jetbrains.exposed.sql.SchemaUtils
import org.jetbrains.exposed.sql.transactions.transaction
import com.colegio.modelos.tables.*
import com.colegio.modelos.entities.*

class ApiTest {

    @BeforeTest
    fun setup() {
        val dbFile = File("test-colegio.db")
        if (dbFile.exists()) dbFile.delete()
        Database.connect("jdbc:sqlite:test-colegio.db", driver = "org.sqlite.JDBC")
        transaction {
            SchemaUtils.createMissingTablesAndColumns(
                ProfesorTable, ConfiguracionTable, AsignaturaTable,
                ProfesorAsignaturaTable, RepartoDocenteTable, GruposTable, CursoTable, ClaseTable
            )
        }
    }

    @Test
    fun testConfigEndpoint() = testApplication {
        application {
            configureHttp()
            configureSerialization()
            configureRouting()
        }

        // Test GET config
        val getRes = client.get("/api/v1/config")
        assertEquals(HttpStatusCode.OK, getRes.status)
        val initialConfig = getRes.bodyAsText()
        assertTrue(initialConfig.contains("priorizarTutor"), "Response must contain 'priorizarTutor'")

        // Test PUT config
        val newConfig = """{"priorizarTutor":false,"tiempoMinimo":45,"tiempoMaximo":90,"minutosMaximosProfesor":1600,"priorizarTutorPuntos":100,"fomentarBloques60Puntos":10,"evitarHuecosPuntos":50,"compactarTempranoPuntos":5}"""
        val putRes = client.put("/api/v1/config") {
            header(HttpHeaders.ContentType, ContentType.Application.Json.toString())
            setBody(newConfig)
        }
        assertEquals(HttpStatusCode.OK, putRes.status)

        val getResUpdated = client.get("/api/v1/config")
        val updatedConfig = getResUpdated.bodyAsText()
        assertTrue(updatedConfig.contains("\"tiempoMinimo\":45"), "Config was not updated")
        assertTrue(updatedConfig.contains("\"priorizarTutor\":false"), "Config was not updated")
    }

    @Test
    fun testTeacherEndpoints() = testApplication {
        application {
            configureHttp()
            configureSerialization()
            configureRouting()
        }

        val newTeacherJson = """{"id":"","name":"Test Teacher","maxHours":40,"color":"#ffffff","subjects":[],"availability":[]}"""
        val postRes = client.post("/api/v1/teachers") {
            header(HttpHeaders.ContentType, ContentType.Application.Json.toString())
            setBody(newTeacherJson)
        }
        assertEquals(HttpStatusCode.OK, postRes.status)
        val responseText = postRes.bodyAsText()
        val jsonElement = Json.parseToJsonElement(responseText).jsonObject
        val teacherId = jsonElement["id"]!!.jsonPrimitive.content

        assertTrue(teacherId.isNotEmpty())

        val getRes = client.get("/api/v1/teachers")
        assertTrue(getRes.bodyAsText().contains("Test Teacher"))

        val deleteRes = client.delete("/api/v1/teachers/${teacherId}")
        assertEquals(HttpStatusCode.OK, deleteRes.status)
    }
}
