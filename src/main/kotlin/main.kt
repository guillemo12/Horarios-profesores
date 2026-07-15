package com.colegio

import com.colegio.DTO.AsignaturaDTO
import com.colegio.modelos.AsignaturaTable
import com.colegio.modelos.ConfiguracionTable
import com.colegio.modelos.ProfesorAsignaturaTable
import com.colegio.modelos.ProfesoresTable
import com.colegio.solver.Profesor
import io.ktor.server.engine.*
import io.ktor.server.application.*
import org.jetbrains.exposed.sql.Database
import org.jetbrains.exposed.sql.JoinType
import org.jetbrains.exposed.sql.SchemaUtils
import org.jetbrains.exposed.sql.batchInsert
import org.jetbrains.exposed.sql.insert
import org.jetbrains.exposed.sql.insertAndGetId
import org.jetbrains.exposed.sql.insertReturning
import org.jetbrains.exposed.sql.selectAll
import org.jetbrains.exposed.sql.transactions.transaction
import java.sql.DriverManager.println
import kotlin.collections.map

fun main(args: Array<String>) {
    // 1. ABRIR EL LIBRO: Conectar a la base de datos SQLite
    // Si el archivo "colegio.db" no existe, SQLite lo creará automáticamente.
    Database.connect("jdbc:sqlite:colegio.db", driver = "org.sqlite.JDBC")

    // 2. PREPARAR LAS PÁGINAS: Crear las tablas si no existen en el archivo
    // Esto evita que te dé un error de "Table 'profesor' not found" la primera vez.
    transaction {
        SchemaUtils.create(ProfesoresTable, ConfiguracionTable, AsignaturaTable, ProfesorAsignaturaTable)
        SchemaUtils.createMissingTablesAndColumns(
            ProfesoresTable,
            ConfiguracionTable,
            AsignaturaTable,
            ProfesorAsignaturaTable
        )

        val primero = ConfiguracionTable.selectAll().firstOrNull()

        if (primero == null) {
            ConfiguracionTable.insert { }
        }

        // ¡NUEVO! Metemos datos de prueba si la tabla está vacía
        val cantidadProfesores = ProfesoresTable.selectAll().count()
        var idGuillermo:Int? = null
        // 1. Insertamos más Profesores
        if (cantidadProfesores == 0L) {
            val ids = ProfesoresTable.batchInsert(listOf("Guillermo", "Ada Lovelace", "Alan Turing", "Grace Hopper")) { nombre ->
                this[ProfesoresTable.nombre] = nombre
            }.map { it[ProfesoresTable.id].value }

            idGuillermo = ids[0] // Guardamos el ID de Guillermo
        }
        val cantidadAsignaturas = AsignaturaTable.selectAll().count()
// 2. Insertamos más Asignaturas
        if (cantidadAsignaturas == 0L) {
            val asignaturas = listOf(
                AsignaturaDTO(nombre = "Matemáticas", curso = "1º", minutos = 60),
                AsignaturaDTO(nombre = "Sistemas Operativos", curso = "1º", minutos = 90),
                AsignaturaDTO(nombre = "Ciencia de Datos", curso = "2º", minutos = 120),
                AsignaturaDTO(nombre = "Arquitectura ARM", curso = "3º", minutos = 90),
                AsignaturaDTO(nombre = "Programación en Kotlin", curso = "3º", minutos = 180)
            )

            AsignaturaTable.batchInsert(asignaturas) { it ->
                this[AsignaturaTable.nombre] = it.nombre
                this[AsignaturaTable.curso] = it.curso
                this[AsignaturaTable.minutos] = it.minutos
            }
        }

        val cantidadRelaciones = ProfesorAsignaturaTable.selectAll().count()
// 3. Insertamos las Relaciones (Muchos a Muchos)
        if (cantidadRelaciones == 0L) {
            // Obtenemos todos los IDs para relacionarlos
            val todosLosProfesores = ProfesoresTable.selectAll().map { it[ProfesoresTable.id] }
            val todasLasAsignaturas = AsignaturaTable.selectAll().map { it[AsignaturaTable.id] }

            val relaciones = listOf(
                // Guillermo (ID[0]) imparte Matemáticas y Arquitectura ARM
                Pair(todosLosProfesores[0], todasLasAsignaturas[0]),
                Pair(todosLosProfesores[0], todasLasAsignaturas[3]),
                // Ada (ID[1]) imparte Sistemas Operativos y Kotlin
                Pair(todosLosProfesores[1], todasLasAsignaturas[1]),
                Pair(todosLosProfesores[1], todasLasAsignaturas[4]),
                // Turing (ID[2]) imparte Ciencia de Datos
                Pair(todosLosProfesores[2], todasLasAsignaturas[2])
            )

            ProfesorAsignaturaTable.batchInsert(relaciones) { (profesorId, asignaturaId) ->
                this[ProfesorAsignaturaTable.profesorId] = profesorId
                this[ProfesorAsignaturaTable.asignaturaId] = asignaturaId
            }

            println("Datos de prueba cargados correctamente con relaciones N:M")
        }
    }
    io.ktor.server.netty.EngineMain.main(args)
}
