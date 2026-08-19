# 🏗️ Guía Arquitectónica del Proyecto (Backend Kotlin + Web TypeScript)

Este documento detalla la estructura modular del proyecto, indicando el propósito y responsabilidad de cada archivo tanto en el backend Kotlin Ktor como en el frontend web TypeScript.

---

## 📂 Backend Kotlin (`src/main/kotlin/`)

El backend está desarrollado en **Kotlin 2.1** sobre el framework **Ktor 3.0** con persistencia en **SQLite** (a través de Exposed ORM) y motor de optimización matemática con **Google OR-Tools CP-SAT**.

### 1. Núcleo de Aplicación y Base de Datos (`src/main/kotlin/`)
- **[main.kt](file:///src/main/kotlin/main.kt)**: Punto de entrada ligero del servidor Ktor (`main()`). Delega en `DatabaseConfig` para el bootstrap de datos y arranca el motor Netty.
- **[Routing.kt](file:///src/main/kotlin/Routing.kt)**: Enrutador principal. Configura los recursos estáticos web (`static/`), registra la ruta de registro de errores de navegador `/api/v1/log` y delega en los módulos REST y WebSocket.
- **[WebSocketRouting.kt](file:///src/main/kotlin/WebSocketRouting.kt)**: Endpoint WebSocket (`/ws`). Utiliza una arquitectura **Productor-Consumidor** con `Channel<SolverProgress>` sin bloqueo para transmitir progresos, puntuaciones y horarios calculados en tiempo real.
- **[Http.kt](file:///src/main/kotlin/Http.kt)**: Configuración de plugins HTTP (CORS, compresión y cabeceras).
- **[Serialization.kt](file:///src/main/kotlin/Serialization.kt)**: Configuración del serializador JSON con `kotlinx.serialization`.

### 2. Base de Datos y Sembrado (`src/main/kotlin/database/`)
- **[DatabaseConfig.kt](file:///src/main/kotlin/database/DatabaseConfig.kt)**: Gestión de conexión SQLite (`jdbc:sqlite:`), resolución de rutas multiplataforma (`AppData` / `home`), reconexión y migraciones automáticas de esquema.
- **[DatabaseSeeder.kt](file:///src/main/kotlin/database/DatabaseSeeder.kt)**: Población inicial idempotente de datos (configuración base, profesores, cursos, grupos, asignaturas y reparto docente equitativo).

### 3. Módulos REST de Sub-Rutas (`src/main/kotlin/routing/`)
- **[SubjectRoutes.kt](file:///src/main/kotlin/routing/SubjectRoutes.kt)**: Endpoints REST para `/api/v1/subjects` (GET, POST, PUT, DELETE de asignaturas).
- **[TeacherRoutes.kt](file:///src/main/kotlin/routing/TeacherRoutes.kt)**: Endpoints REST para `/api/v1/teachers` (gestión de profesores y sus disponibilidades/preferencias).
- **[CourseRoutes.kt](file:///src/main/kotlin/routing/CourseRoutes.kt)**: Endpoints REST para `/api/v1/courses` y `/api/v1/assignments` (gestión de cursos, grupos y asignaciones lectivas).
- **[ScheduleRoutes.kt](file:///src/main/kotlin/routing/ScheduleRoutes.kt)**: Endpoints REST para `/api/v1/scheduledClasses` (lectura, fijado PIN manual, actualización y borrado de clases).
- **[PrevalidationRoutes.kt](file:///src/main/kotlin/routing/PrevalidationRoutes.kt)**: Endpoint `/api/v1/prevalidation` para diagnósticos de factibilidad antes de invocar al solver.
- **[SystemRoutes.kt](file:///src/main/kotlin/routing/SystemRoutes.kt)**: Endpoints `/api/v1/system/database/export` (backup con `VACUUM INTO`) e `/api/v1/system/database/import` (restauración segura).
- **[DateTimeSlotUtils.kt](file:///src/main/kotlin/routing/DateTimeSlotUtils.kt)**: Funciones puras para resolución temporal de franjas y formateo ISO 8601.

### 4. Motor de Resolución y Diagnósticos (`src/main/kotlin/solver/`)
- **[OrToolsScheduleSolver.kt](file:///src/main/kotlin/solver/OrToolsScheduleSolver.kt)**: Motor principal de optimización basado en Google OR-Tools CP-SAT Solver. Aplica restricciones duras y funciones de puntuación suave transmitiendo soluciones intermedias en tiempo real.
- **[SolverConstraintUtils.kt](file:///src/main/kotlin/solver/SolverConstraintUtils.kt)**: Funciones puras para agrupación de unidades lectivas (`groupLessonsIntoUnits`), extracción de grupos, traducción de días (`traducirDia`) y validación de disponibilidad docente.
- **[SolverLessonDataLoader.kt](file:///src/main/kotlin/solver/SolverLessonDataLoader.kt)**: Generación de franjas horarias configuradas (`generateTimeSlots`) y cálculo de cantidad de bloques lectivos (`calculateBlocksCount`).
- **[Prevalidation.kt](file:///src/main/kotlin/solver/Prevalidation.kt)**: Diagnóstico estático ultra-rápido de inviabilidad (déficits de horas, sobrecarga docente y consejos específicos).
- **[TimeSlot.kt](file:///src/main/kotlin/solver/TimeSlot.kt)**: Representación de franjas horarias semanales (Día, hora inicio, hora fin y duración).
- **[Leccion.kt](file:///src/main/kotlin/solver/Leccion.kt)**, **[Profesor.kt](file:///src/main/kotlin/solver/Profesor.kt)**, **[Grupo.kt](file:///src/main/kotlin/solver/Grupo.kt)**: Modelos de dominio del solver.

### 5. DTOs y Modelos de Persistencia
- **`src/main/kotlin/DTO/`**: DTOs serializables JSON (`CourseDto.kt`, `SubjectDto.kt`, `TeacherDto.kt`, `ScheduledClassDto.kt`, `Configuracion.kt`, `WsMessage.kt`, etc.).
- **`src/main/kotlin/modelos/tables/`**: Tablas Exposed (`ProfesorTable`, `CursoTable`, `GruposTable`, `AsignaturaTable`, `ClaseTable`, `RepartoDocenteTable`, `ConfiguracionTable`).
- **`src/main/kotlin/modelos/entities/`**: Entidades DAO (`ProfesorEntity`, `CursosEntity`, `GruposEntity`, `AsignaturaEntity`, `ClaseEntity`, `ConfiguracionEntity`).

---

## 🌐 Web Project TypeScript (`Web/src/`)

El frontend web está desarrollado en **TypeScript** estructurado bajo principios de Clean Code y compilado con **esbuild** hacia `src/main/resources/static/Datos.js`.

### 1. Núcleo y Coordinación
- **[Datos.ts](file:///Web/src/Datos.ts)**: Inicializador global de la aplicación, interceptor global de errores, conexión WebSocket y ciclo de vida de la UI.
- **[navigation.ts](file:///Web/src/navigation.ts)**: Gestión de cambio de pestañas (`switchTab`) y sincronización del selector de vista de horarios (`updateEntitySelector`).
- **[types.ts](file:///Web/src/types.ts)**: Definición de interfaces TypeScript estrictas (`AppDataState`, `Teacher`, `Subject`, `Course`, `ScheduledClass`, `Config`).
- **[api.ts](file:///Web/src/api.ts)**: Cliente REST tipado para comunicación asíncrona con el backend Ktor.
- **[websocket.ts](file:///Web/src/websocket.ts)**: Cliente WebSocket con reconexión automática y emisión tipada de eventos del motor.
- **[utils.ts](file:///Web/src/utils.ts)**: Utilidades visuales (toasts, formateo de horas `formatHours`).
- **[updater.ts](file:///Web/src/updater.ts)**: Módulo de actualización automática en 1 clic conectado a GitHub Releases.

### 2. Gestión del Horario y Calendario
- **[calendar.ts](file:///Web/src/calendar.ts)**: Inicialización y renderizado de la cuadrícula con Toast UI Calendar.
- **[calendar_events.ts](file:///Web/src/calendar_events.ts)**: Fusión inteligente de franjas contiguas en bloques multi-hora (30m, 1h, 1.5h, 2.0h) respetando el recreo y pines de fijado.
- **[calendar_modal.ts](file:///Web/src/calendar_modal.ts)**: Modales interactivos de inserción/edición de clases y visualización de detalles.
- **[calendar_validation.ts](file:///Web/src/calendar_validation.ts)**: Validaciones puras de rango de tiempo (`isValidTimeRange`), cálculo de franjas (`calculateSlotCount`) y comprobación de solapamiento con recreo.
- **[calendar_colors.ts](file:///Web/src/calendar_colors.ts)**: Asignación y persistencia de colores por materia y profesor.

### 3. Módulos CRUD y Asignaciones
- **[crud.ts](file:///Web/src/crud.ts)**: Coordinador y re-exportador de operaciones CRUD.
- **[crud_subjects.ts](file:///Web/src/crud_subjects.ts)**: Formularios y tablas de gestión de asignaturas con filtros por curso.
- **[crud_teachers.ts](file:///Web/src/crud_teachers.ts)**: Gestión de profesores, carga lectiva y especialidades impartibles.
- **[crud_courses.ts](file:///Web/src/crud_courses.ts)**: Gestión de cursos y grupos escolares.
- **[assignments.ts](file:///Web/src/assignments.ts)**: Matriz interactiva de reparto docente y asignación de profesores a grupos.
- **[availability.ts](file:///Web/src/availability.ts)**: Matriz semanal de restricciones de disponibilidad horaria por profesor.
- **[settings.ts](file:///Web/src/settings.ts)**: Panel de configuración de parámetros del centro y motor de optimización.
- **[prevalidation.ts](file:///Web/src/prevalidation.ts)**: Panel interactivo de auditoría y diagnóstico de viabilidad.

### 4. Estadísticas, Copias de Seguridad e Impresión
- **[stats.ts](file:///Web/src/stats.ts)**: Cálculo puro de métricas escolares (capacidad horaria vs. horas lectivas demandadas, balance de plantilla).
- **[backup_manager.ts](file:///Web/src/backup_manager.ts)**: Validación, exportación (`.db`) e importación de copias de seguridad de la base de datos.
- **[print.ts](file:///Web/src/print.ts)**: Renderizado de plantillas de impresión oficial para grupos y docentes.
- **[print_grid.ts](file:///Web/src/print_grid.ts)**: Generador puro de matrices horarias y detección de intervalos de recreo.

---

## 🧪 Pruebas Automatizadas

- **Frontend (`tests/*.mjs`)**: Suite ESM con Node.js Test Runner (138 tests automatizados, $\ge 2$ tests por método):
  ```powershell
  npm.cmd test
  ```
- **Backend (`src/test/kotlin/`)**: Tests unitarios y de persistencia rápida en JUnit 5:
  ```powershell
  ./gradlew.bat test
  ```
