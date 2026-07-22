package com.colegio

import io.ktor.server.application.*
import io.ktor.server.routing.*
import io.ktor.server.websocket.*
import io.ktor.websocket.*
import org.slf4j.LoggerFactory

fun Application.configureSockets() {
    val logger = LoggerFactory.getLogger("WebSocket")

    install(WebSockets) {
        maxFrameSize = Long.MAX_VALUE
        masking = false
    }

    routing {
        webSocket("/ws") { // Ruta: ws://localhost:8080/ws
            logger.info("Cliente conectado: $this")

            try {
                for (frame in incoming) {
                    if (frame is Frame.Text) {
                        val mensajeRecibido = frame.readText()
                        logger.info("Mensaje recibido: $mensajeRecibido")

                        // Responder al cliente
                        send(Frame.Text("Eco desde Ktor: $mensajeRecibido"))
                    }
                }
            } catch (e: Exception) {
                logger.error("Error en WebSocket: ${e.localizedMessage}")
            } finally {
                logger.info("Cliente desconectado")
            }
        }
    }
}