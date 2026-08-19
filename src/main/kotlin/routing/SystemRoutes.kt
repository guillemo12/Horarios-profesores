package com.colegio.routing

import com.colegio.getDatabasePath
import com.colegio.reconnectDatabase
import io.ktor.http.*
import io.ktor.http.content.*
import io.ktor.server.application.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlinx.serialization.Serializable
import org.slf4j.LoggerFactory
import java.io.File
import java.io.FileInputStream
import java.io.FileOutputStream
import java.net.HttpURLConnection
import java.net.URI
import java.time.LocalDate
import java.time.format.DateTimeFormatter

@Serializable
data class InstallUpdateRequest(
    val downloadUrl: String,
    val fileName: String
)

@Serializable
data class InstallUpdateResponse(
    val success: Boolean,
    val message: String
)

@Serializable
data class DatabaseOperationResponse(
    val success: Boolean,
    val message: String
)

fun Route.systemRoutes() {
    val logger = LoggerFactory.getLogger("SystemRoutes")

    route("/system") {
        // --- 1. INSTALACIÓN DE ACTUALIZACIONES EN 1 CLIC ---
        post("/update/install") {
            try {
                val req = call.receive<InstallUpdateRequest>()
                if (req.downloadUrl.isBlank()) {
                    call.respond(HttpStatusCode.BadRequest, InstallUpdateResponse(false, "URL de descarga no proporcionada."))
                    return@post
                }

                logger.info("Iniciando descarga de actualización desde: ${req.downloadUrl}")

                val tempDir = File(System.getProperty("java.io.tmpdir"), "EduScheduleUpdates")
                if (!tempDir.exists()) {
                    tempDir.mkdirs()
                }

                val safeFileName = if (req.fileName.isNotBlank()) req.fileName else "EduSchedule_update.exe"
                val targetFile = File(tempDir, safeFileName)

                withContext(Dispatchers.IO) {
                    var currentUrl = req.downloadUrl
                    var connection: HttpURLConnection
                    var redirects = 0
                    while (true) {
                        val uri = URI.create(currentUrl)
                        connection = uri.toURL().openConnection() as HttpURLConnection
                        connection.instanceFollowRedirects = false
                        connection.setRequestProperty("User-Agent", "EduSchedule-AutoUpdater")
                        val status = connection.responseCode
                        if (status == HttpURLConnection.HTTP_MOVED_TEMP || status == HttpURLConnection.HTTP_MOVED_PERM || status == HttpURLConnection.HTTP_SEE_OTHER || status == 307 || status == 308) {
                            val newUrl = connection.getHeaderField("Location")
                            connection.disconnect()
                            if (newUrl != null && redirects < 10) {
                                currentUrl = newUrl
                                redirects++
                                continue
                            }
                        }
                        break
                    }

                    connection.inputStream.use { input ->
                        FileOutputStream(targetFile).use { output ->
                            input.copyTo(output)
                        }
                    }
                }

                logger.info("Descarga completada en: ${targetFile.absolutePath} (${targetFile.length()} bytes)")

                val isWindows = System.getProperty("os.name").lowercase().contains("windows")
                if (isWindows) {
                    ProcessBuilder("cmd.exe", "/c", "start", "", targetFile.absolutePath)
                        .directory(tempDir)
                        .start()
                } else {
                    targetFile.setExecutable(true)
                    ProcessBuilder(targetFile.absolutePath)
                        .directory(tempDir)
                        .start()
                }

                call.respond(HttpStatusCode.OK, InstallUpdateResponse(true, "Actualización iniciada. Reiniciando aplicación..."))

                kotlinx.coroutines.CoroutineScope(Dispatchers.Default).launch {
                    delay(1500)
                    System.exit(0)
                }
            } catch (e: Exception) {
                logger.error("Error al descargar/instalar actualización", e)
                call.respond(HttpStatusCode.InternalServerError, InstallUpdateResponse(false, "Error: ${e.message}"))
            }
        }

        // --- 2. EXPORTAR BASE DE DATOS (BACKUP) ---
        get("/database/export") {
            try {
                val dbPath = getDatabasePath()
                val dbFile = File(dbPath)

                if (!dbFile.exists()) {
                    call.respond(HttpStatusCode.NotFound, DatabaseOperationResponse(false, "No se encontró el archivo de base de datos."))
                    return@get
                }

                val dateStr = LocalDate.now().format(DateTimeFormatter.ISO_DATE)
                val exportFileName = "EduSchedule_Backup_$dateStr.db"

                call.response.header(
                    HttpHeaders.ContentDisposition,
                    ContentDisposition.Attachment.withParameter(ContentDisposition.Parameters.FileName, exportFileName).toString()
                )
                call.respondFile(dbFile)
            } catch (e: Exception) {
                logger.error("Error al exportar base de datos", e)
                call.respond(HttpStatusCode.InternalServerError, DatabaseOperationResponse(false, "Error al exportar: ${e.message}"))
            }
        }

        // --- 3. IMPORTAR / RESTAURAR BASE DE DATOS (RESTORE) ---
        post("/database/import") {
            try {
                val multipart = call.receiveMultipart()
                var uploadedFile: File? = null
                val tempDir = File(System.getProperty("java.io.tmpdir"), "EduScheduleRestore")
                if (!tempDir.exists()) {
                    tempDir.mkdirs()
                }

                multipart.forEachPart { part ->
                    if (part is PartData.FileItem) {
                        val tempFile = File(tempDir, "temp_import_${System.currentTimeMillis()}.db")
                        @Suppress("DEPRECATION")
                        part.streamProvider().use { input ->
                            FileOutputStream(tempFile).use { output ->
                                input.copyTo(output)
                            }
                        }
                        uploadedFile = tempFile
                    }
                    @Suppress("DEPRECATION")
                    part.dispose()
                }

                val file = uploadedFile
                if (file == null || !file.exists() || file.length() < 100) {
                    call.respond(HttpStatusCode.BadRequest, DatabaseOperationResponse(false, "Archivo de base de datos no válido o vacío."))
                    return@post
                }

                // Validar cabecera SQLite ("SQLite format 3\u0000")
                val header = ByteArray(16)
                FileInputStream(file).use { it.read(header) }
                val headerString = String(header, Charsets.UTF_8)
                if (!headerString.startsWith("SQLite format 3")) {
                    file.delete()
                    call.respond(HttpStatusCode.BadRequest, DatabaseOperationResponse(false, "El archivo seleccionado no es una base de datos SQLite válida."))
                    return@post
                }

                val currentDbPath = getDatabasePath()
                val currentDbFile = File(currentDbPath)

                // Crear backup de seguridad previo
                if (currentDbFile.exists()) {
                    val safetyBackup = File(currentDbFile.parentFile, "colegio.db.safety_backup")
                    try {
                        currentDbFile.copyTo(safetyBackup, overwrite = true)
                    } catch (ex: Exception) {
                        logger.warn("No se pudo crear backup de seguridad previo: ${ex.message}")
                    }
                }

                // Sobrescribir archivo de base de datos
                withContext(Dispatchers.IO) {
                    file.copyTo(currentDbFile, overwrite = true)
                    file.delete()
                }

                // Reconectar base de datos en caliente
                reconnectDatabase()

                logger.info("Base de datos importada y restaurada con éxito en: $currentDbPath")
                call.respond(HttpStatusCode.OK, DatabaseOperationResponse(true, "Base de datos restaurada correctamente."))
            } catch (e: Exception) {
                logger.error("Error al importar base de datos", e)
                call.respond(HttpStatusCode.InternalServerError, DatabaseOperationResponse(false, "Error al restaurar base de datos: ${e.message}"))
            }
        }
    }
}
