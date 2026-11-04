plugins {
    alias(libs.plugins.kotlin.jvm)
    alias(ktorLibs.plugins.ktor)
    alias(libs.plugins.kotlin.serialization)

}

group = "com.colegio"
version = "1.0.0-SNAPSHOT"

application {
    // Fíjate en la "Kt" al final, es muy importante
    mainClass.set("com.colegio.MainKt")

    applicationDefaultJvmArgs = listOf(
        "-XX:+UseParallelGC",
        "-XX:+UseStringDeduplication"
    )
}

ktor {
    development = false // <-- PON ESTO A FALSE
}

kotlin {
    jvmToolchain(21)
}
dependencies {
    implementation(ktorLibs.serialization.kotlinx.json)
    implementation(ktorLibs.server.callLogging)
    implementation(ktorLibs.server.config.yaml)
    implementation(ktorLibs.server.contentNegotiation)
    implementation(ktorLibs.server.core)
    implementation(ktorLibs.server.cors)
    implementation(ktorLibs.server.netty)
    implementation(libs.logback.classic)

    testImplementation(kotlin("test"))
    testImplementation(ktorLibs.server.testHost)

    // Exposed (ORM)
    implementation(libs.exposed.core)
    implementation(libs.exposed.dao)
    implementation(libs.exposed.jdbc)
    implementation(libs.exposed.java.time)
    implementation(libs.sqlite.jdbc)

    // Google OR-Tools (Motor de optimización matemática y viabilidad)
    implementation(libs.ortools.java)

    implementation(libs.poi.ooxml)

    // WebSocket
    implementation("io.ktor:ktor-server-websockets")
}

tasks.test {
    maxHeapSize = "2g"
    // Excluir tests que ejecutan el motor completo de optimización (CP-SAT / Stress / Concurrency)
    exclude("**/*StressTest*", "**/*SolverTest*", "**/*Concurrency*", "**/*Performance*")
}

tasks.register<Test>("fullEngineTest") {
    group = "verification"
    description = "Ejecuta todos los tests del motor de optimización matemática CP-SAT y pruebas de concurrencia pesadas."
    maxHeapSize = "4g"
    include("**/*StressTest*", "**/*SolverTest*", "**/*Concurrency*", "**/*Performance*")
}

tasks.named<org.gradle.jvm.tasks.Jar>("shadowJar") {
    archiveFileName.set("horarios-profesores-all.jar")
}


