package com.colegio.database

import com.colegio.modelos.tables.*
import org.jetbrains.exposed.sql.Database
import org.jetbrains.exposed.sql.SchemaUtils
import org.jetbrains.exposed.sql.transactions.transaction
import java.io.File
import java.util.concurrent.atomic.AtomicBoolean

object DatabaseConfig {

    private val isDbInitialized = AtomicBoolean(false)

    /**
     * Resuelve la ruta absoluta del archivo de base de datos SQLite según el entorno (propiedad JVM, variable de entorno o AppData/Home).
     */
    fun getDatabasePath(): String {
        val customPath = System.getProperty("eduschedule.db.path") ?: System.getenv("EDUSCHEDULE_DB_PATH")
        if (!customPath.isNullOrBlank()) {
            return customPath
        }

        val appData = System.getenv("APPDATA") ?: System.getenv("LOCALAPPDATA")
        val dbDir = if (!appData.isNullOrBlank()) {
            File(appData, "EduSchedule")
        } else {
            File(System.getProperty("user.home"), ".eduschedule")
        }

        if (!dbDir.exists()) {
            dbDir.mkdirs()
        }

        return File(dbDir, "colegio.db").absolutePath
    }

    /**
     * Conecta y asegura la creación de todas las tablas requeridas por el esquema escolar.
     */
    fun connect(dbPath: String = getDatabasePath()): Database {
        val db = Database.connect("jdbc:sqlite:$dbPath", driver = "org.sqlite.JDBC")
        transaction {
            SchemaUtils.createMissingTablesAndColumns(
                ProfesorTable, ConfiguracionTable, AsignaturaTable,
                ProfesorAsignaturaTable, RepartoDocenteTable, GruposTable, CursoTable, ClaseTable
            )
        }
        return db
    }

    /**
     * Reconecta la base de datos limpiando el estado de inicialización previo.
     */
    fun reconnectDatabase() {
        isDbInitialized.set(false)
        connect()
    }

    /**
     * Inicializa la base de datos y ejecuta el sembrado inicial si es la primera ejecución.
     */
    fun initDatabase() {
        if (!isDbInitialized.compareAndSet(false, true)) return
        connect()
        DatabaseSeeder.seedInitialDataIfEmpty()
    }
}
