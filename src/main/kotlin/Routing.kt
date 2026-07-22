package com.colegio

import com.colegio.Constantes.solucion
import com.colegio.solver.Simulacion
import io.ktor.http.HttpStatusCode
import io.ktor.server.application.*
import io.ktor.server.http.content.*
import io.ktor.server.response.*
import io.ktor.server.routing.*

fun Application.configureRouting() {
    routing {
        get("/") {
            call.respondText("Hello, World!")
        }
        staticResources("/static", "static")
        get("/json/kotlinx-serialization") {
            call.respond(mapOf("hello" to "world"))
        }
        get("/Hola") {
            Simulacion()
            call.respondText("Hola")
        }
        get("/fin"){
            solucion!!.terminateEarly()
            call.respond(HttpStatusCode.OK)
        }
    }
}