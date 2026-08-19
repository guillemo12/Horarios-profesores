package com.colegio

import com.colegio.database.DatabaseConfig
import io.ktor.server.netty.EngineMain
import java.awt.Desktop
import java.net.URI

fun getDatabasePath(): String = DatabaseConfig.getDatabasePath()

fun reconnectDatabase(): Unit = DatabaseConfig.reconnectDatabase()

fun initDatabase(): Unit = DatabaseConfig.initDatabase()

fun main(args: Array<String>) {
    initDatabase()

    if (args.contains("--open-browser") || System.getenv("EDUSCHEDULE_OPEN_BROWSER") == "true") {
        Thread {
            try {
                Thread.sleep(1500)
                if (Desktop.isDesktopSupported() && Desktop.getDesktop().isSupported(Desktop.Action.BROWSE)) {
                    Desktop.getDesktop().browse(URI("http://localhost:8080"))
                } else {
                    Runtime.getRuntime().exec(arrayOf("cmd", "/c", "start", "http://localhost:8080"))
                }
            } catch (_: Exception) {}
        }.start()
    }

    EngineMain.main(args)
}