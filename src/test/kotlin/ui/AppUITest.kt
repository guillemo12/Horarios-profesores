package com.colegio.ui

import com.colegio.configureHttp
import com.colegio.configureRouting
import com.colegio.configureSerialization
import com.colegio.configureSockets
import com.microsoft.playwright.Browser
import com.microsoft.playwright.BrowserType
import com.microsoft.playwright.Page
import com.microsoft.playwright.Playwright
import io.ktor.server.engine.embeddedServer
import io.ktor.server.netty.Netty
import org.jetbrains.exposed.sql.Database
import org.jetbrains.exposed.sql.SchemaUtils
import org.jetbrains.exposed.sql.transactions.transaction
import java.io.File
import kotlin.test.*

class AppUITest {
    private lateinit var server: io.ktor.server.engine.EmbeddedServer<io.ktor.server.netty.NettyApplicationEngine, io.ktor.server.netty.NettyApplicationEngine.Configuration>
    private lateinit var playwright: Playwright
    private lateinit var browser: Browser
    private lateinit var page: Page

    @BeforeTest
    fun setup() {
        // Prepare clean database
        val dbFile = File("ui-test-colegio.db")
        if (dbFile.exists()) dbFile.delete()
        Database.connect("jdbc:sqlite:ui-test-colegio.db", driver = "org.sqlite.JDBC")
        transaction {
            SchemaUtils.createMissingTablesAndColumns(
                com.colegio.modelos.tables.ProfesorTable, com.colegio.modelos.tables.ConfiguracionTable,
                com.colegio.modelos.tables.AsignaturaTable, com.colegio.modelos.tables.ProfesorAsignaturaTable,
                com.colegio.modelos.tables.RepartoDocenteTable, com.colegio.modelos.tables.GruposTable,
                com.colegio.modelos.tables.CursoTable, com.colegio.modelos.tables.ClaseTable
            )
        }

        // Start Ktor server
        server = embeddedServer(Netty, port = 8081) {
            configureHttp()
            configureSerialization()
            configureSockets()
            configureRouting()
        }
        server.start(wait = false)

        // Initialize Playwright
        playwright = Playwright.create()
        browser = playwright.chromium().launch(BrowserType.LaunchOptions().setHeadless(true))
        page = browser.newPage()
    }

    @AfterTest
    fun teardown() {
        page.close()
        browser.close()
        playwright.close()
        server.stop(1000, 1000)
    }

    @Test
    fun testUINavigatesToConfigurationAndTogglesSettings() {
        page.navigate("http://localhost:8081/")

        // Wait for page to load and loader to disappear
        page.waitForSelector("#nav-calendar")

        // Navigate to settings tab
        page.click("#nav-settings")

        // Assert we are on settings
        val configTitle = page.locator("h2:has-text('Configuración del Motor')")
        assertTrue(configTitle.isVisible)

        // Ensure inputs are loaded correctly before acting
        page.waitForTimeout(500.0)

        // Change a setting
        page.fill("#settings-tiempo-minimo", "45")

        // Click save
        page.click("button:has-text('Guardar Configuración')")

        // Wait for UI to update (toast)
        page.waitForTimeout(1000.0)
    }
}
