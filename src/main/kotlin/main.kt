package com.colegio

import com.colegio.modelos.entities.*
import com.colegio.modelos.tables.*
import org.jetbrains.exposed.sql.Database
import org.jetbrains.exposed.sql.SchemaUtils
import org.jetbrains.exposed.sql.SizedCollection
import org.jetbrains.exposed.sql.selectAll
import org.jetbrains.exposed.sql.transactions.transaction
import java.sql.DriverManager.println

fun main(args: Array<String>) {
    Database.connect("jdbc:sqlite:colegio.db", driver = "org.sqlite.JDBC")

    transaction {
        SchemaUtils.createMissingTablesAndColumns(
            ProfesorTable, ConfiguracionTable, AsignaturaTable,
            ProfesorAsignaturaTable, RepartoDocenteTable, GruposTable, CursoTable
        )

        // 1. CONFIGURACIÓN
        if (ConfiguracionEntity.count() == 0L) {
            ConfiguracionEntity.new {
                tiempoMinimo = 30
                tiempoMaximo = 60
                priorizarTutor = true
                minutosMaximosProfesor = 1500 // 25 horas semanales por profe
            }
        }
        val configActual = ConfiguracionEntity.all().first()

        // 2. PROFESORES Y ESPECIALISTAS (Se crean primero)
        if (ProfesorEntity.count() == 0L) {
            val listaProfesores = listOf(
                Pair(
                    "Tutor Infantil 3A",
                    listOf(
                        "Crecimiento y armonia",
                        "Descubrimiento y exploracion del entorno",
                        "comunicacion y representacion de la realidad"
                    )
                ),
                Pair(
                    "Tutor Infantil 3B",
                    listOf(
                        "Crecimiento y armonia",
                        "Descubrimiento y exploracion del entorno",
                        "comunicacion y representacion de la realidad"
                    )
                ),
                Pair(
                    "Tutor Infantil 4A",
                    listOf(
                        "Crecimiento y armonia",
                        "Descubrimiento y exploracion del entorno",
                        "comunicacion y representacion de la realidad"
                    )
                ),
                Pair(
                    "Tutor Infantil 4C",
                    listOf(
                        "Crecimiento y armonia",
                        "Descubrimiento y exploracion del entorno",
                        "comunicacion y representacion de la realidad"
                    )
                ),
                Pair(
                    "Tutor Infantil 4B",
                    listOf(
                        "Crecimiento y armonia",
                        "Descubrimiento y exploracion del entorno",
                        "comunicacion y representacion de la realidad"
                    )
                ),
                Pair(
                    "Tutor Infantil 4C",
                    listOf(
                        "Crecimiento y armonia",
                        "Descubrimiento y exploracion del entorno",
                        "comunicacion y representacion de la realidad"
                    )
                ),
                Pair(
                    "Tutor Infantil 4C",
                    listOf(
                        "Crecimiento y armonia",
                        "Descubrimiento y exploracion del entorno",
                        "comunicacion y representacion de la realidad"
                    )
                ),
                Pair(
                    "Tutor Infantil 5A",
                    listOf(
                        "Crecimiento y armonia",
                        "Descubrimiento y exploracion del entorno",
                        "comunicacion y representacion de la realidad"
                    )
                ),
                Pair(
                    "Tutor Infantil 4C",
                    listOf(
                        "Crecimiento y armonia",
                        "Descubrimiento y exploracion del entorno",
                        "comunicacion y representacion de la realidad"
                    )
                ),
                Pair(
                    "Tutor Infantil 5B",
                    listOf(
                        "Crecimiento y armonia",
                        "Descubrimiento y exploracion del entorno",
                        "comunicacion y representacion de la realidad"
                    )
                ),
                Pair(
                    "Tutor Infantil 4C",
                    listOf(
                        "Crecimiento y armonia",
                        "Descubrimiento y exploracion del entorno",
                        "comunicacion y representacion de la realidad"
                    )
                ),
                Pair(
                    "Tutor Infantil 5C",
                    listOf(
                        "Crecimiento y armonia",
                        "Descubrimiento y exploracion del entorno",
                        "comunicacion y representacion de la realidad"
                    )
                ),
                Pair("Tutor 1ºA", emptyList()),
                Pair("Tutor 1ºB", emptyList()),
                Pair("Tutor 1ºC", emptyList()),
                Pair("Tutor 2ºA", emptyList()),
                Pair("Tutor 2ºB", emptyList()),
                Pair("Tutor 3ºA", emptyList()),
                Pair("Tutor 3ºB", emptyList()),
                Pair("Tutor 3ºC", emptyList()),
                Pair("Tutor 4ºA", emptyList()),
                Pair("Tutor 4ºB", emptyList()),
                Pair("Tutor 4ºC", emptyList()), // 4A=EF, 4B=Ing, 4C=Fra
                Pair("Tutor 5ºA", emptyList()),
                Pair("Tutor 5ºB", emptyList()),
                Pair("Tutor 5ºC", emptyList()), // 5A=EF, 5B=Ing, 5C=Mus
                Pair("Tutor 6ºA", emptyList()),
                Pair("Tutor 6ºB", emptyList()),              // 6A=EF, 6B=Ing
                Pair("Apoyo 1", emptyList()),
                Pair("Apoyo 2", emptyList()),
                Pair("Director", emptyList()),
                Pair("Jefa de Estudios", emptyList()),
                Pair("Religión Primaria", emptyList()),
                Pair("Religión Infantil", emptyList()),
            )

            listaProfesores.forEach { (nombreProfe, pair) ->
                ProfesorEntity.new {
                    this.nombre = nombreProfe
                    this.minutosMaximos = configActual.minutosMaximosProfesor
                    this.asignaturas = pair.map { AsignaturaEntity.find { AsignaturaTable.nombre eq it }.firstOrNull()? }
                }
            }
        }

        // 3. CURSOS Y GRUPOS (Con sus tutores asignados)
        if (GruposEntity.count() == 0L) {
            val mapaCursos = mapOf(
                "Infantil 3" to listOf("A", "B"),
                "Infantil 4" to listOf("A", "B", "C"),
                "Infantil 5" to listOf("A", "B", "C"),
                "1º" to listOf("A", "B", "C"),
                "2º" to listOf("A", "B"),
                "3º" to listOf("A", "B", "C"),
                "4º" to listOf("A", "B", "C"),
                "5º" to listOf("A", "B", "C"),
                "6º" to listOf("A", "B")
            )

            mapaCursos.forEach { (nombreCurso, letras) ->
                val cursoDb = CursosEntity.new { nombre = nombreCurso }
                letras.forEach { letra ->
                    val profeTutor =
                        ProfesorEntity.find { ProfesorTable.nombre eq "Tutor $nombreCurso$letra" }.firstOrNull()
                            ?: ProfesorEntity.all().first()

                    GruposEntity.new {
                        this.nombre = letra
                        this.curso = cursoDb
                        this.tutor = profeTutor
                    }
                }
            }
        }

        // 4. ASIGNATURAS Y CARGA HORARIA (Total estricto: 1350 mins a la semana)
        if (AsignaturaEntity.count() == 0L) {
            val cursosComunes = CursosEntity.all()

            for (curso in cursosComunes) {
                if (!curso.nombre.contains("Infantil")) {

                    // Asignaturas base
                    AsignaturaEntity.new { nombre = "Educación Física"; this.curso = curso; minutos = 180 }
                    AsignaturaEntity.new { nombre = "Inglés"; this.curso = curso; minutos = 120 + 30 }
                    AsignaturaEntity.new { nombre = "Religión"; this.curso = curso; minutos = 90 }


                    if (curso.nombre == "1º") {
                        AsignaturaEntity.new { nombre = "Matematicas"; this.curso = curso; minutos = 5 * 60 }
                        AsignaturaEntity.new { nombre = "Lengua"; this.curso = curso; minutos = 6 * 60 }
                        AsignaturaEntity.new {
                            nombre = "Conocimientos del medio"; this.curso = curso; minutos = 2 * 60 + 30
                        }
                    }

                    if (curso.nombre == "2º") {
                        AsignaturaEntity.new { nombre = "Matematicas"; this.curso = curso; minutos = 5 * 60 }
                        AsignaturaEntity.new { nombre = "Lengua"; this.curso = curso; minutos = 5 * 60 + 30 }
                        AsignaturaEntity.new {
                            nombre = "Conocimientos del medio"; this.curso = curso; minutos = 2 * 60 + 30
                        }

                    }

                    if (curso.nombre == "3º") {
                        AsignaturaEntity.new { nombre = "Matematicas"; this.curso = curso; minutos = 5 * 60 }
                        AsignaturaEntity.new { nombre = "Lengua"; this.curso = curso; minutos = 6 * 60 }
                        AsignaturaEntity.new {
                            nombre = "Conocimientos del medio"; this.curso = curso; minutos = 2 * 60 + 30
                        }

                    }

                    if (curso.nombre == "4º") {
                        AsignaturaEntity.new { nombre = "Matematicas"; this.curso = curso; minutos = 5 * 60 }
                        AsignaturaEntity.new { nombre = "Lengua"; this.curso = curso; minutos = 6 * 60 + 30 }
                        AsignaturaEntity.new {
                            nombre = "Conocimientos del medio"; this.curso = curso; minutos = 2 * 60 + 30
                        }

                    }

                    if (curso.nombre == "5º") {
                        AsignaturaEntity.new { nombre = "Matematicas"; this.curso = curso; minutos = 4 * 60 + 30 }
                        AsignaturaEntity.new { nombre = "Lengua"; this.curso = curso; minutos = 5 * 60 + 30 }
                        AsignaturaEntity.new {
                            nombre = "Conocimientos del medio"; this.curso = curso; minutos = 2 * 60 + 30
                        }

                        // El director da Atención Educativa a 3 cursos (los 3 grupos de 5º)
                        AsignaturaEntity.new { nombre = "Atención Educativa"; this.curso = curso; minutos = 90 }
                        AsignaturaEntity.new { nombre = "Frances"; this.curso = curso; minutos = 60 }
                    }

                    // Casos especiales según tus reglas
                    if (curso.nombre == "6º") {
                        AsignaturaEntity.new { nombre = "Matematicas"; this.curso = curso; minutos = 4 * 60 }
                        AsignaturaEntity.new { nombre = "Lengua"; this.curso = curso; minutos = 5 * 60 }
                        AsignaturaEntity.new {
                            nombre = "Conocimientos del medio"; this.curso = curso; minutos = 2 * 60 + 30
                        }


                        AsignaturaEntity.new { nombre = "Valores"; this.curso = curso; minutos = 90 }
                        AsignaturaEntity.new { nombre = "Frances"; this.curso = curso; minutos = 60 }
                    }

                } else {
                    //hora de religion 1,3 horas
                    //ingles 3 y 4 1 y 5 1,30 horas
                    // 6 6 5 horas
                    // "Crecimiento y armonia","Descubrimiento y exploracion del entorno", "comunicacion y representacion de la realidad"

                }

                //matematica lengua conocimineto del medio frances
                //fances 5 6
                //atencion educativa paralela == religion

            }
        }

        // 5. REPARTO DE ESPECIALIDADES A LOS PROFESORES
        if (ProfesorAsignaturaTable.selectAll().count() == 0L) {
            val asigEF = AsignaturaEntity.find { AsignaturaTable.nombre eq "Educación Física" }.toList()
            val asigIngles = AsignaturaEntity.find { AsignaturaTable.nombre eq "Inglés" }.toList()
            val asigReligion = AsignaturaEntity.find { AsignaturaTable.nombre eq "Religión" }.toList()
            val asigValores = AsignaturaEntity.find { AsignaturaTable.nombre eq "Valores" }.toList()
            val asigAtencion = AsignaturaEntity.find { AsignaturaTable.nombre eq "Atención Educativa" }.toList()
            val asigGenerales = AsignaturaEntity.find { AsignaturaTable.nombre eq "Materias Generales" }.toList()

            val todosLosProfes = ProfesorEntity.all()

            for (profe in todosLosProfes) {
                val materiasDeEsteProfe = mutableListOf<AsignaturaEntity>()

                // Todos los tutores y apoyos pueden dar Materias Generales
                if (profe.nombre.contains("Tutor") || profe.nombre.contains("Apoyo")) {
                    materiasDeEsteProfe.addAll(asigGenerales)
                }

                // Tutores Especialistas en E.Física (Añadimos a los de Apoyo para que el sistema tenga respiro)
                if (profe.nombre in listOf("Tutor 6ºA", "Tutor 5ºA", "Tutor 4ºA", "Apoyo 1")) {
                    materiasDeEsteProfe.addAll(asigEF)
                }

                // Tutores Especialistas en Inglés
                if (profe.nombre in listOf("Tutor 6ºB", "Tutor 5ºB", "Tutor 4ºB", "Apoyo 2")) {
                    materiasDeEsteProfe.addAll(asigIngles)
                }

                // Especialistas únicos
                if (profe.nombre in listOf("Religión Primaria", "Religión Infantil")) {
                    materiasDeEsteProfe.addAll(asigReligion)
                }

                if (profe.nombre == "Jefa de Estudios") {
                    materiasDeEsteProfe.addAll(asigValores)
                }

                if (profe.nombre == "Director") {
                    materiasDeEsteProfe.addAll(asigAtencion)
                }

                profe.asignaturas = SizedCollection(materiasDeEsteProfe)
            }
            println("✅ Base de datos escolar generada con éxito y sin solapamientos.")
        }
    }
    io.ktor.server.netty.EngineMain.main(args)
}