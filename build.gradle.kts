// Replace the previous buildWeb task
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
    implementation("org.jetbrains.exposed:exposed-core:0.50.1")
    implementation("org.jetbrains.exposed:exposed-dao:0.50.1")
    implementation("org.jetbrains.exposed:exposed-jdbc:0.50.1")
    implementation("org.xerial:sqlite-jdbc:3.45.1.0")

    // Timefold (Matemáticas)
    implementation("ai.timefold.solver:timefold-solver-core:1.1.0")

    implementation("org.apache.poi:poi-ooxml:5.3.0")

    // WebSocket
    implementation("io.ktor:ktor-server-websockets")
}

dependencies {
    testImplementation("com.microsoft.playwright:playwright:1.44.0")
}

tasks.register<Exec>("buildWeb") {
    workingDir = file("Web")
    commandLine = listOf("/home/jules/.deno/bin/deno", "run", "-A", "build.ts")
}

tasks.named("processResources") {
    dependsOn("buildWeb")
}
