package com.colegio.database

import com.colegio.modelos.entities.*
import com.colegio.modelos.tables.*
import org.jetbrains.exposed.sql.SizedCollection
import org.jetbrains.exposed.sql.deleteAll
import org.jetbrains.exposed.sql.insert
import org.jetbrains.exposed.sql.selectAll
import org.jetbrains.exposed.sql.transactions.transaction
import org.slf4j.LoggerFactory

object DatabaseSeeder {
    private val logger = LoggerFactory.getLogger("DatabaseSeeder")

    /**
     * Si la base de datos está vacía, genera los registros base de configuración, profesores, cursos y asignaturas.
     */
    fun seedInitialDataIfEmpty() {
        transaction {
            seedConfigurationIfEmpty()
            seedTeachersIfEmpty()
            seedCoursesAndGroupsIfEmpty()
            seedSubjectsIfEmpty()
            seedTeacherSpecialtiesIfEmpty()
            seedDefaultAssignmentsIfNecessary()
        }
    }

    private fun seedConfigurationIfEmpty() {
        if (ConfiguracionEntity.count() == 0L) {
            ConfiguracionEntity.new {
                tiempoMinimo = 30
                tiempoMaximo = 60
                priorizarTutor = true
                minutosMaximosProfesor = 22 * 60 + 30
            }
        }
    }

    private fun seedTeachersIfEmpty() {
        if (ProfesorEntity.count() == 0L) {
            val configActual = ConfiguracionEntity.all().firstOrNull()
            val maxMinutes = configActual?.minutosMaximosProfesor ?: (22 * 60 + 30)

            val listaNombresProfesores = listOf(
                "Tutor Infantil 3A", "Tutor Infantil 3B", "Tutor Infantil 4A", "Tutor Infantil 4B", "Tutor Infantil 4C",
                "Tutor Infantil 5A", "Tutor Infantil 5B", "Tutor Infantil 5C",
                "Tutor 1ºA", "Tutor 1ºB", "Tutor 1ºC", "Tutor 2ºA", "Tutor 2ºB",
                "Tutor 3ºA", "Tutor 3ºB", "Tutor 3ºC", "Tutor 4ºA", "Tutor 4ºB", "Tutor 4ºC",
                "Tutor 5ºA", "Tutor 5ºB", "Tutor 5ºC", "Tutor 6ºA", "Tutor 6ºB",
                "Apoyo 1", "Apoyo 2", "Director", "Jefa de Estudios",
                "Religión Primaria", "Religión Infantil", "Especialista Francés", "Especialista Música"
            )

            val coloresHtml = listOf(
                "#ef4444", "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6",
                "#ec4899", "#14b8a6", "#6366f1", "#06b6d4", "#84cc16",
                "#a855f7", "#f97316"
            )

            listaNombresProfesores.forEachIndexed { index, nombreProfe ->
                ProfesorEntity.new {
                    this.nombre = nombreProfe
                    this.minutosMaximos = maxMinutes
                    this.color = coloresHtml[index % coloresHtml.size]
                }
            }
        }
    }

    private fun seedCoursesAndGroupsIfEmpty() {
        if (GruposEntity.count() == 0L) {
            val mapaCursos = mapOf(
                "Infantil 3" to listOf("A", "B"), "Infantil 4" to listOf("A", "B", "C"), "Infantil 5" to listOf("A", "B", "C"),
                "1º" to listOf("A", "B", "C"), "2º" to listOf("A", "B"), "3º" to listOf("A", "B", "C"),
                "4º" to listOf("A", "B", "C"), "5º" to listOf("A", "B", "C"), "6º" to listOf("A", "B")
            )

            mapaCursos.forEach { (nombreCurso, letras) ->
                val cursoDb = CursosEntity.new { nombre = nombreCurso }
                letras.forEach { letra ->
                    val profeTutor = ProfesorEntity.find { ProfesorTable.nombre eq "Tutor $nombreCurso$letra" }.firstOrNull()
                        ?: ProfesorEntity.all().first()
                    GruposEntity.new { this.nombre = letra; this.curso = cursoDb; this.tutor = profeTutor }
                }
            }
        }
    }

    private fun seedSubjectsIfEmpty() {
        if (AsignaturaEntity.count() == 0L) {
            val cursosComunes = CursosEntity.all()
            val totalMinutosSemanales = 1350

            for (curso in cursosComunes) {
                if (curso.nombre.contains("Infantil")) {
                    val esInfantil3o4 = curso.nombre.contains("3") || curso.nombre.contains("4")
                    val minIngles = if (esInfantil3o4) 60 else 90
                    val minReligion = 90

                    AsignaturaEntity.new { nombre = "Inglés"; this.curso = curso; minutos = minIngles }
                    AsignaturaEntity.new { nombre = "Religión"; this.curso = curso; minutos = minReligion }

                    val tiempoSobrante = totalMinutosSemanales - minIngles - minReligion
                    val tiempoPorTroncal = tiempoSobrante / 3

                    AsignaturaEntity.new { nombre = "Crecimiento y armonia"; this.curso = curso; minutos = tiempoPorTroncal }
                    AsignaturaEntity.new { nombre = "Descubrimiento y exploracion del entorno"; this.curso = curso; minutos = tiempoPorTroncal }
                    AsignaturaEntity.new { nombre = "Comunicacion y representacion de la realidad"; this.curso = curso; minutos = tiempoPorTroncal }
                } else {
                    AsignaturaEntity.new { nombre = "Educación Física"; this.curso = curso; minutos = 180 }
                    AsignaturaEntity.new { nombre = "Inglés"; this.curso = curso; minutos = 150 }
                    AsignaturaEntity.new { nombre = "Religión"; this.curso = curso; minutos = 90 }

                    var mat = 300
                    var len = 300
                    var cm = 150
                    var otros = 0

                    when (curso.nombre) {
                        "1º" -> { len = 360 }
                        "2º" -> { len = 330 }
                        "3º" -> { len = 360 }
                        "4º" -> { len = 390 }
                        "5º" -> {
                            mat = 270; len = 330; otros = 150
                            AsignaturaEntity.new { nombre = "Francés"; this.curso = curso; minutos = 60 }
                            AsignaturaEntity.new { nombre = "Atención Educativa"; this.curso = curso; minutos = 90 }
                        }
                        "6º" -> {
                            mat = 240; len = 300; otros = 150
                            AsignaturaEntity.new { nombre = "Francés"; this.curso = curso; minutos = 60 }
                            AsignaturaEntity.new { nombre = "Valores"; this.curso = curso; minutos = 90 }
                        }
                    }

                    AsignaturaEntity.new { nombre = "Matemáticas"; this.curso = curso; minutos = mat }
                    AsignaturaEntity.new { nombre = "Lengua"; this.curso = curso; minutos = len }
                    AsignaturaEntity.new { nombre = "Conocimientos del medio"; this.curso = curso; minutos = cm }

                    val sumatoriaAsignada = 180 + 150 + 90 + mat + len + cm + otros
                    val minutosRestantes = totalMinutosSemanales - sumatoriaAsignada

                    if (minutosRestantes > 0) {
                        AsignaturaEntity.new { nombre = "Tutoría"; this.curso = curso; minutos = minutosRestantes }
                    }
                }
            }
        }
    }

    private fun seedTeacherSpecialtiesIfEmpty() {
        if (ProfesorAsignaturaTable.selectAll().count() == 0L) {
            val asigEF = AsignaturaEntity.find { AsignaturaTable.nombre eq "Educación Física" }.toList()
            val asigIngles = AsignaturaEntity.find { AsignaturaTable.nombre eq "Inglés" }.toList()
            val asigReligion = AsignaturaEntity.find { AsignaturaTable.nombre eq "Religión" }.toList()
            val asigFrances = AsignaturaEntity.find { AsignaturaTable.nombre eq "Francés" }.toList()
            val asigValores = AsignaturaEntity.find { AsignaturaTable.nombre eq "Valores" }.toList()
            val asigAtencion = AsignaturaEntity.find { AsignaturaTable.nombre eq "Atención Educativa" }.toList()

            val troncalesPrimaria = listOf("Matemáticas", "Lengua", "Conocimientos del medio", "Tutoría").flatMap {
                AsignaturaEntity.find { AsignaturaTable.nombre eq it }.toList()
            }
            val troncalesInfantil = listOf("Crecimiento y armonia", "Descubrimiento y exploracion del entorno", "Comunicacion y representacion de la realidad").flatMap {
                AsignaturaEntity.find { AsignaturaTable.nombre eq it }.toList()
            }

            ProfesorEntity.all().forEach { profe ->
                val materiasDeEsteProfe = mutableListOf<AsignaturaEntity>()

                if (profe.nombre.contains("Tutor Infantil")) {
                    materiasDeEsteProfe.addAll(troncalesInfantil)
                } else if (profe.nombre.contains("Tutor ") || profe.nombre.contains("Apoyo")) {
                    materiasDeEsteProfe.addAll(troncalesPrimaria)
                }

                if (profe.nombre in listOf("Tutor 6ºA", "Tutor 5ºA", "Tutor 4ºA")) materiasDeEsteProfe.addAll(asigEF)
                if (profe.nombre in listOf("Tutor 6ºB", "Tutor 5ºB", "Tutor 4ºB", "Apoyo 2")) materiasDeEsteProfe.addAll(asigIngles)
                if (profe.nombre == "Especialista Francés") materiasDeEsteProfe.addAll(asigFrances)

                if (profe.nombre == "Religión Primaria" || profe.nombre == "Religión Infantil") materiasDeEsteProfe.addAll(asigReligion)
                if (profe.nombre == "Jefa de Estudios") materiasDeEsteProfe.addAll(asigValores)
                if (profe.nombre == "Director") materiasDeEsteProfe.addAll(asigAtencion)

                profe.asignaturas = SizedCollection(materiasDeEsteProfe)
            }
            logger.info("Especialidades docentes asignadas correctamente.")
        }
    }

    private fun seedDefaultAssignmentsIfNecessary() {
        val repartoCount = RepartoDocenteTable.selectAll().count()
        var necesitaLimpieza = repartoCount == 0L

        if (repartoCount > 0) {
            val cargasProfesor = mutableMapOf<Int, Int>()
            RepartoDocenteTable.selectAll().forEach { row ->
                val pId = row[RepartoDocenteTable.profesorId].value
                val aId = row[RepartoDocenteTable.asignaturaId].value
                val asig = AsignaturaEntity.findById(aId)
                if (asig != null) {
                    cargasProfesor[pId] = (cargasProfesor[pId] ?: 0) + asig.minutos
                }
            }
            if (cargasProfesor.values.any { it > 25 * 60 }) {
                necesitaLimpieza = true
                logger.warn("Sobrecargas detectadas en reparto docente existente (> 25h/semana). Regenerando equitativamente...")
            }
        }

        if (necesitaLimpieza) {
            RepartoDocenteTable.deleteAll()
            val cargaDocenteMinutos = mutableMapOf<Int, Int>()

            GruposEntity.all().forEach { grupo ->
                val cursoObj = grupo.curso
                val tutorObj = grupo.tutor
                val asignaturasDelCurso = AsignaturaEntity.find { AsignaturaTable.curso eq cursoObj.id }.toList()

                asignaturasDelCurso.forEach { asignatura ->
                    val asigClean = asignatura.nombre.trim().lowercase()
                    val tutorPuedeDarla = tutorObj.asignaturas.any { it.nombre.trim().lowercase() == asigClean }

                    val profeAsignado = if (tutorPuedeDarla) {
                        tutorObj
                    } else {
                        val cualificados = ProfesorEntity.all().filter { prof ->
                            prof.asignaturas.any { it.nombre.trim().lowercase() == asigClean }
                        }
                        cualificados.minByOrNull { cargaDocenteMinutos.getOrDefault(it.id.value, 0) }
                    }

                    if (profeAsignado != null) {
                        cargaDocenteMinutos[profeAsignado.id.value] = (cargaDocenteMinutos.getOrDefault(profeAsignado.id.value, 0)) + asignatura.minutos

                        RepartoDocenteTable.insert {
                            it[grupoId] = grupo.id
                            it[asignaturaId] = asignatura.id
                            it[profesorId] = profeAsignado.id
                        }
                    }
                }
            }
            logger.info("Asignaciones de reparto docente inicializadas equitativamente.")
        }
    }
}
