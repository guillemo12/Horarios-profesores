package com.colegio

import com.colegio.routing.*
import io.ktor.server.application.*
import io.ktor.server.http.content.*
import io.ktor.server.request.*
import io.ktor.server.routing.*
import kotlinx.serialization.Serializable
import org.slf4j.LoggerFactory

@Serializable
data class PrevalidationResult(
    val viable: Boolean,
    val checks: List<PrevalidationCheck>
)

@Serializable
data class PrevalidationCheck(
    val name: String,
    val status: String,
    val message: String,
    val details: List<String> = emptyList()
)

// --- AUXILIAR DE PARSEO DE IDS ---
fun parseId(idStr: String): Int {
    val clean = idStr.replace(Regex("^[a-zA-Z]+-"), "")
    return clean.toIntOrNull() ?: 1
}

fun Application.configureRouting() {
    val routingLogger = LoggerFactory.getLogger("FrontendLog")

    routing {
        staticResources("/", "static", index = "index.html")

        route("/api/v1") {
            // --- LOG DE ERRORES DEL FRONTEND ---
            post("/log") {
                @Serializable data class FrontendLogEntry(val level: String = "error", val message: String = "", val source: String = "", val line: Int = 0, val stack: String = "")
                try {
                    val entry = call.receive<FrontendLogEntry>()
                    val msg = "[BROWSER] ${entry.message} (${entry.source}:${entry.line})"
                    when (entry.level) {
                        "warn" -> routingLogger.warn(msg + if (entry.stack.isNotBlank()) "\n${entry.stack}" else "")
                        else   -> routingLogger.error(msg + if (entry.stack.isNotBlank()) "\n${entry.stack}" else "")
                    }
                } catch (_: Exception) {}
            }

            // --- RUTAS MODULARIZADAS DE LA API REST ---
            subjectRoutes()
            teacherRoutes()
            courseRoutes()
            scheduleRoutes()
            prevalidationRoutes()
            configRoutes()
        }
    }
}
