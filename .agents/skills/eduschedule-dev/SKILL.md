---
name: eduschedule-dev
description: Guía completa y manual operativo para ejecutar, depurar, compilar y probar cada componente del proyecto EduSchedule (Backend Kotlin Ktor, Frontend TypeScript, Contenedor Desktop Tauri v2 y Base de Datos SQLite).
---

# EduSchedule Development & Execution Guide

Este documento es la **Skill oficial del proyecto EduSchedule** para desarrolladores y agentes de IA. Describe la arquitectura, dependencias y los comandos exactos para ejecutar, probar y compilar cada componente de forma individual o conjunta.

---

## 🏛️ 1. Arquitectura Modular del Proyecto

EduSchedule es una aplicación de escritorio multiplataforma con arquitectura desacoplada y Clean Code:

```
                  ┌────────────────────────────────────────────────────────┐
                  │                 Tauri v2 (Rust Container)             │
                  │             Proyecto_Horarios/src-tauri/               │
                  │                                                        │
                  │  ┌─────────────────────────┐  ┌─────────────────────┐  │
                  │  │   WebView2 (Frontend)   │  │ Embedded JRE Engine │  │
                  │  │ HTML + Tailwind + TS    │  │ (jlink + Kotlin Fat)│  │
                  │  └───────────┬─────────────┘  └──────────┬──────────┘  │
                  └──────────────┼───────────────────────────┼─────────────┘
                                 │ HTTP / REST & WebSockets  │
                                 ▼                           ▼
                         ┌───────────────────────────────────────────────┐
                         │              Ktor Backend Server              │
                         │          (Kotlin 2.1 / JVM 21 / 8080)         │
                         │                                               │
                         │  - DatabaseConfig & DatabaseSeeder            │
                         │  - Exposed ORM (SQLite en %APPDATA%/EduSched) │
                         │  - Google OR-Tools CP-SAT Solver              │
                         │  - REST Sub-routes & WebSocket Channel        │
                         └───────────────────────────────────────────────┘
```

---

## 💻 2. Estructura de Archivos

### 🌐 A. Frontend (TypeScript + HTML + Tailwind CSS)
- **Ubicación**: `Web/src/`
- **Archivos Clave**:
  - `Web/src/eduschedule.html` (interfaz de usuario principal)
  - `Web/src/Datos.ts` (coordinador de estado global, inicialización y WebSocket)
  - `Web/src/navigation.ts` (navegación entre pestañas y selectores de vista)
  - `Web/src/calendar.ts`, `calendar_events.ts`, `calendar_modal.ts`, `calendar_colors.ts` (motor de calendario y tarjetas fusionadas multi-hora)
  - `Web/src/crud.ts`, `crud_subjects.ts`, `crud_teachers.ts`, `crud_courses.ts` (gestión modular de entidades escolares)
  - `Web/src/assignments.ts`, `availability.ts`, `settings.ts`, `prevalidation.ts` (gestión lectiva y auditoría)
  - `Web/src/stats.ts`, `backup_manager.ts`, `print.ts`, `print_grid.ts` (métricas, copias de seguridad e impresión)
  - `Web/src/updater.ts` (módulo de comprobación y actualización en 1 clic)
- **Destino del Bundle**: `src/main/resources/static/Datos.js`

### ⚙️ B. Backend (Kotlin + Ktor + Exposed + OR-Tools)
- **Ubicación**: `src/main/kotlin/`
- **Archivos Clave**:
  - `main.kt` (bootstrap ligero de la aplicación Ktor)
  - `database/DatabaseConfig.kt` y `database/DatabaseSeeder.kt` (gestión de SQLite y sembrado inicial)
  - `routing/` (`SubjectRoutes.kt`, `TeacherRoutes.kt`, `CourseRoutes.kt`, `ScheduleRoutes.kt`, `PrevalidationRoutes.kt`, `SystemRoutes.kt`, `DateTimeSlotUtils.kt`)
  - `solver/` (`OrToolsScheduleSolver.kt`, `SolverConstraintUtils.kt`, `Prevalidation.kt`, `TimeSlot.kt`, `Leccion.kt`)

---

## 🚀 3. Comandos de Compilación y Pruebas

### Frontend:
```powershell
# 1. Empaquetar TypeScript con esbuild:
& "C:\Program Files\nodejs\npx.cmd" esbuild Web/src/Datos.ts --bundle --outfile=src/main/resources/static/Datos.js --minify --sourcemap --target=es2020; & "C:\Program Files\nodejs\npx.cmd" esbuild Web/src/Datos.ts --bundle --outfile=Web/src/Datos.js --sourcemap

# 2. Ejecutar suite completa de tests de frontend (138 tests ESM):
npm.cmd test
```

### Backend:
```powershell
# 1. Iniciar el servidor backend en desarrollo:
./gradlew.bat run

# 2. Ejecutar tests unitarios y de persistencia rápida:
./gradlew.bat test

# 3. Generar el Fat JAR ejecutable (ShadowJar):
./gradlew.bat shadowJar --no-daemon
```

### Desktop Container (Tauri v2):
```powershell
cd Proyecto_Horarios/src-tauri
cargo tauri dev
```
