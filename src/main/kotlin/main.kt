package com.colegio

import com.colegio.modelos.ConfiguracionTable
import com.colegio.modelos.ProfesoresTable
import io.ktor.server.engine.*
import io.ktor.server.application.*
import org.jetbrains.exposed.sql.Database
import org.jetbrains.exposed.sql.SchemaUtils
import org.jetbrains.exposed.sql.insert
import org.jetbrains.exposed.sql.selectAll
import org.jetbrains.exposed.sql.transactions.transaction
import java.sql.DriverManager.println

fun main(args: Array<String>) {
    // 1. ABRIR EL LIBRO: Conectar a la base de datos SQLite
    // Si el archivo "colegio.db" no existe, SQLite lo creará automáticamente.
    Database.connect("jdbc:sqlite:colegio.db", driver = "org.sqlite.JDBC")

    // 2. PREPARAR LAS PÁGINAS: Crear las tablas si no existen en el archivo
    // Esto evita que te dé un error de "Table 'profesor' not found" la primera vez.
    transaction {
        SchemaUtils.create(ProfesoresTable,ConfiguracionTable)
        SchemaUtils.createMissingTablesAndColumns(ProfesoresTable,ConfiguracionTable)

        val primero = ConfiguracionTable.selectAll().firstOrNull()

        if (primero == null) {
            ConfiguracionTable.insert {  }
        }

        // ¡NUEVO! Metemos datos de prueba si la tabla está vacía
        val cantidadProfesores = ProfesoresTable.selectAll().count()
        if (cantidadProfesores == 0L) {
            println("La tabla está vacía. Insertando profesores de prueba...")

            ProfesoresTable.insert {
                it[nombre] = "Guillermo"
                it[especialidad] = "Informática"
            }
            ProfesoresTable.insert {
                it[nombre] = "Ada Lovelace"
                it[especialidad] = "Matemáticas"
            }
        }
    }
    io.ktor.server.netty.EngineMain.main(args)
}
