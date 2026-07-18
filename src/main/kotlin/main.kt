package com.colegio

import com.colegio.DTO.AsignaturaDTO
import com.colegio.modelos.*
import com.colegio.modelos.entities.*
import com.colegio.modelos.tables.CursoTable
import com.colegio.modelos.tables.GruposTable
import org.jetbrains.exposed.sql.Database
import org.jetbrains.exposed.sql.SchemaUtils
import org.jetbrains.exposed.sql.SizedCollection
import org.jetbrains.exposed.sql.selectAll
import org.jetbrains.exposed.sql.transactions.transaction
import java.sql.DriverManager.println

fun main(args: Array<String>) {
    // 1. ABRIR EL LIBRO: Conectar a la base de datos SQLite
    // Si el archivo "colegio.db" no existe, SQLite lo creará automáticamente.
    Database.connect("jdbc:sqlite:colegio.db", driver = "org.sqlite.JDBC")

    transaction {
        // 1. LA ESTRUCTURA FÍSICA SIGUE IGUAL (El DDL siempre es DSL)
        SchemaUtils.create(
            ProfesorTable,
            ConfiguracionTable,
            AsignaturaTable,
            ProfesorAsignaturaTable,
            RepartoDocenteTable,
            GruposTable,
            CursoTable
        )
        SchemaUtils.createMissingTablesAndColumns(
            ProfesorTable,
            ConfiguracionTable,
            AsignaturaTable,
            ProfesorAsignaturaTable,
            RepartoDocenteTable,
            GruposTable,
            CursoTable
        )

        // 2. CONFIGURACIÓN (Usamos la Entidad)
        if (ConfiguracionEntity.count() == 0L) {
            ConfiguracionEntity.new {
                // Pon aquí tus valores por defecto si los tiene
            }
        }

        // 3. PROFESORES
        if (ProfesorEntity.count() == 0L) {
            val nombres = listOf("Guillermo", "Ada Lovelace", "Alan Turing", "Grace Hopper")

            nombres.forEach { nombreProfe ->
                ProfesorEntity.new {
                    nombre = nombreProfe
                }
            }
        }

        // 4. ASIGNATURAS
        if (AsignaturaEntity.count() == 0L) {
            val asignaturas = listOf(
                AsignaturaDTO(nombre = "Matemáticas", curso = "1º", minutos = 60),
                AsignaturaDTO(nombre = "Sistemas Operativos", curso = "1º", minutos = 90),
                AsignaturaDTO(nombre = "Ciencias sociales", curso = "1º", minutos = 90),
                AsignaturaDTO(nombre = "Cartografia", curso = "1º", minutos = 90),
                AsignaturaDTO(nombre = "Ciencia de Datos", curso = "2º", minutos = 120),
                AsignaturaDTO(nombre = "Arquitectura ARM", curso = "3º", minutos = 90),
                AsignaturaDTO(nombre = "Programación en Kotlin", curso = "3º", minutos = 180),
                AsignaturaDTO(nombre = "Física", curso = "2º", minutos = 90)
            )

            asignaturas.forEach { asig ->
                // 1. Buscamos el curso si ya existe en la base de datos,
                //    o lo creamos si es la primera vez que aparece.
                //    (Asumo que tienes alguna propiedad como 'asig.nombreCurso' para identificarlo)
                val cursoDeLaAsignatura = CursosEntity.find { CursoTable.nombre eq asig.curso }.firstOrNull()
                    ?: CursosEntity.new {
                        nombre = asig.curso
                    }

                AsignaturaEntity.new {
                    nombre = asig.nombre
                    curso = cursoDeLaAsignatura
                    minutos = asig.minutos
                }
            }
        }

        // 5. LAS RELACIONES (Aquí brilla el DAO)
        // Seguimos comprobando la tabla intermedia para no duplicar datos
        if (ProfesorAsignaturaTable.selectAll().count() == 0L) {

            // Cargamos todos los objetos en RAM (toList() los extrae de la base de datos)
            val profes = ProfesorEntity.all().toList()
            val asigs = AsignaturaEntity.all().toList()

            // profes[0] = Guillermo, profes[1] = Ada, profes[2] = Turing...
            // asigs[0] = Mates, asigs[1] = SS.OO., asigs[2] = Datos, asigs[3] = ARM, asigs[4] = Kotlin

            // En lugar de cruzar IDs, le asignamos la lista de objetos Asignatura a cada Profesor

            // Guillermo imparte Matemáticas (0) y Arquitectura ARM (3)
            profes[0].asignaturas = SizedCollection(listOf(asigs[0], asigs[3]))

            // Ada imparte Sistemas Operativos (1) y Kotlin (4)
            profes[1].asignaturas = SizedCollection(listOf(asigs[1], asigs[4]))

            // Turing imparte Ciencia de Datos (2)
            // Turing imparte Ciencias sociales (2) y Arquitectura ARM (5)
            profes[2].asignaturas = SizedCollection(listOf(asigs[2], asigs[5]))

            // Hopper imparte Programación en Kotlin (6)
            profes[3].asignaturas = SizedCollection(listOf(asigs[6]))

            // Como ya vimos, al cerrar la transacción (}), Exposed hará automáticamente todos
            // los INSERTs necesarios en la tabla ProfesorAsignaturaTable.
            println("Datos de prueba cargados correctamente usando objetos DAO")
        }


        if (GruposEntity.count() == 0L) {
            val profes = ProfesorEntity.all().toList()
            GruposEntity.new {
                nombre = "A"
                curso = CursosEntity.find { CursoTable.nombre eq "1º" }.first()
                tutor = profes[0]
            }
            GruposEntity.new {
                nombre = "A"
                curso = CursosEntity.find { CursoTable.nombre eq "2º" }.first()
                tutor = profes[1]
            }
            GruposEntity.new {
                nombre = "A"
                curso = CursosEntity.find { CursoTable.nombre eq "3º" }.first()
                tutor = profes[2]
            }


            GruposEntity.new {
                nombre = "B"
                curso = CursosEntity.find { CursoTable.nombre eq "1º" }.first()
                tutor = profes[0]
            }
            GruposEntity.new {
                nombre = "C"
                curso = CursosEntity.find { CursoTable.nombre eq "2º" }.first()
                tutor = profes[1]
            }
            GruposEntity.new {
                nombre = "D"
                curso = CursosEntity.find { CursoTable.nombre eq "3º" }.first()
                tutor = profes[2]
            }

        }
    }
    io.ktor.server.netty.EngineMain.main(args)
}
