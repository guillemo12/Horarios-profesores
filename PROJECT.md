# Project: EduSchedule Architecture, Codebase Modules & Engineering Standards

## Architecture Overview
EduSchedule is a cross-platform school schedule management and automated optimization system:
- **Backend Server**: Kotlin 2.1, Ktor 3.0 on JVM 21 (Temurin), Exposed ORM, SQLite DB, Google OR-Tools CP-SAT Solver 9.8.
- **Frontend Client**: Modern TypeScript, Tailwind CSS, Toast UI Calendar, esbuild compilation targeting `src/main/resources/static/Datos.js`.
- **Desktop Container**: Tauri v2 (Rust container wrapping WebView2 + embedded JVM).
- **Inter-process & Network**: HTTP REST API + WebSocket real-time progress streaming for solver optimization.

## Modular Code Layout

### Backend Kotlin (`src/main/kotlin/`)
- **Bootstrap & Routing**: `main.kt`, `Routing.kt`, `WebSocketRouting.kt`, `Http.kt`, `Serialization.kt`
- **Database Architecture (`database/`)**: `DatabaseConfig.kt`, `DatabaseSeeder.kt`
- **REST Endpoints (`routing/`)**: `SubjectRoutes.kt`, `TeacherRoutes.kt`, `CourseRoutes.kt`, `ScheduleRoutes.kt`, `PrevalidationRoutes.kt`, `SystemRoutes.kt`, `DateTimeSlotUtils.kt`
- **Solver & Optimization (`solver/`)**: `OrToolsScheduleSolver.kt`, `SolverConstraintUtils.kt`, `Prevalidation.kt`, `TimeSlot.kt`, `Leccion.kt`, `Profesor.kt`, `Grupo.kt`
- **Entities & Tables (`modelos/`)**: `entities/` (`ProfesorEntity.kt`, `CursosEntity.kt`, `GruposEntity.kt`, `AsignaturaEntity.kt`, `ClaseEntity.kt`, `ConfiguracionEntity.kt`), `tables/` (`ProfesorTable.kt`, etc.)
- **DTOs (`DTO/`)**: `TeacherDto.kt`, `CourseDto.kt`, `SubjectDto.kt`, `ScheduledClassDto.kt`, `Configuracion.kt`, `WsMessage.kt`, etc.

### Frontend TypeScript (`Web/src/`)
- **Core & Lifecycle**: `Datos.ts`, `navigation.ts`, `types.ts`, `api.ts`, `websocket.ts`, `updater.ts`, `utils.ts`
- **Calendar Engine**: `calendar.ts`, `calendar_events.ts`, `calendar_modal.ts`, `calendar_colors.ts`
- **CRUD & Assignments**: `crud.ts`, `crud_subjects.ts`, `crud_teachers.ts`, `crud_courses.ts`, `assignments.ts`, `availability.ts`, `settings.ts`, `prevalidation.ts`
- **Reporting & Utilities**: `stats.ts`, `backup_manager.ts`, `print.ts`, `print_grid.ts`

### Testing Suites & Clean Code Standards
- **Frontend Testing (`tests/`)**: 138 unit tests in Node.js ESM format (`npm.cmd test`).
- **Backend Testing (`src/test/kotlin/`)**: JUnit 5 unit, routing, and persistence tests (`./gradlew.bat test`).
- **Engineering Standard**: Clean Code (SRP, DRY, KISS) with a mandatory minimum of 2 tests per method (Happy path + Edge case) and zero regression policies.
