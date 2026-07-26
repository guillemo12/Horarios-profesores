# 🏗️ Guía Arquitectónica del Proyecto (Backend Kotlin + Web TypeScript)

Este documento detalla la estructura modular del proyecto, indicando el propósito y responsabilidad de cada archivo tanto en el backend Kotlin Ktor como en el frontend web TypeScript.

---

## 📂 Backend Kotlin (`src/main/kotlin/`)

El backend está desarrollado en **Kotlin** sobre el framework **Ktor** con persistencia en **SQLite** (a través de Exposed) y motor de optimización matemática con **Google OR-Tools CP-SAT**.

### 1. Núcleo de Aplicación y Rutas (`src/main/kotlin/`)
- **[Application.kt](file:///d:/Usuarios/Guillermo/Escritorio/Proyecto_horarios/Horarios-profesores/src/main/kotlin/Application.kt)**: Punto de entrada del servidor Ktor (`main()`). Configura la base de datos SQLite y carga la inicialización de datos.
- **[Routing.kt](file:///d:/Usuarios/Guillermo/Escritorio/Proyecto_horarios/Horarios-profesores/src/main/kotlin/Routing.kt)**: Enrutador principal. Configura los recursos estáticos web (`static/`), registra la ruta de registro de errores de navegador `/api/v1/log` y delega en todos los módulos de sub-rutas.
- **[WebSocketRouting.kt](file:///d:/Usuarios/Guillermo/Escritorio/Proyecto_horarios/Horarios-profesores/src/main/kotlin/WebSocketRouting.kt)**: Endpoint WebSocket (`/solver/ws`). Utiliza una arquitectura **Productor-Consumidor** con `Channel<SolverProgress>` sin bloqueo para enviar actualizaciones de soluciones en tiempo real al navegador.

### 2. Módulos REST de Sub-Rutas (`src/main/kotlin/routing/`)
- **[SubjectRoutes.kt](file:///d:/Usuarios/Guillermo/Escritorio/Proyecto_horarios/Horarios-profesores/src/main/kotlin/routing/SubjectRoutes.kt)**: Endpoints REST para `/api/v1/subjects` (GET, POST, PUT, DELETE de asignaturas).
- **[TeacherRoutes.kt](file:///d:/Usuarios/Guillermo/Escritorio/Proyecto_horarios/Horarios-profesores/src/main/kotlin/routing/TeacherRoutes.kt)**: Endpoints REST para `/api/v1/teachers` (gestión de profesores y sus disponibilidades/preferencias).
- **[CourseRoutes.kt](file:///d:/Usuarios/Guillermo/Escritorio/Proyecto_horarios/Horarios-profesores/src/main/kotlin/routing/CourseRoutes.kt)**: Endpoints REST para `/api/v1/courses` (gestión de cursos, grupos asociados y asignaciones de asignaturas).
- **[ScheduleRoutes.kt](file:///d:/Usuarios/Guillermo/Escritorio/Proyecto_horarios/Horarios-profesores/src/main/kotlin/routing/ScheduleRoutes.kt)**: Endpoints REST para `/api/v1/scheduledClasses` (lectura, fijado manual, actualización y borrado de clases en el cuadrante).
- **[PrevalidationRoutes.kt](file:///d:/Usuarios/Guillermo/Escritorio/Proyecto_horarios/Horarios-profesores/src/main/kotlin/routing/PrevalidationRoutes.kt)**: Endpoint `/api/v1/prevalidation` para ejecutar diagnósticos de factibilidad antes de iniciar el solver.
- **[ConfigRoutes.kt](file:///d:/Usuarios/Guillermo/Escritorio/Proyecto_horarios/Horarios-profesores/src/main/kotlin/routing/ConfigRoutes.kt)**: Endpoint `/api/v1/config` para guardar y recuperar la configuración de reglas duras y suaves.

### 3. Motor de Resolución y Diagnósticos (`src/main/kotlin/solver/`)
- **[OrToolsScheduleSolver.kt](file:///d:/Usuarios/Guillermo/Escritorio/Proyecto_horarios/Horarios-profesores/src/main/kotlin/solver/OrToolsScheduleSolver.kt)**: Motor principal de optimización basado en Google OR-Tools CP-SAT Solver. Genera variables booleanas por (Lección, Franja, Profesor), aplica restricciones duras y funciones de puntuación suave. Transmite progresos por callback de forma thread-safe usando `AtomicReference`.
- **[Prevalidation.kt](file:///d:/Usuarios/Guillermo/Escritorio/Proyecto_horarios/Horarios-profesores/src/main/kotlin/solver/Prevalidation.kt)**: Módulo ultra-rápido de diagnóstico de inviabilidad. Detecta en milisegundos déficits exactos de horas por asignatura, sobrecarga docente, solapamientos manuales y calcula consejos específicos para el usuario.
- **[TimeSlot.kt](file:///d:/Usuarios/Guillermo/Escritorio/Proyecto_horarios/Horarios-profesores/src/main/kotlin/solver/TimeSlot.kt)**: Representación de franjas horarias semanales (Día, hora de inicio, hora de fin y duración).
- **[Modelos.kt](file:///d:/Usuarios/Guillermo/Escritorio/Proyecto_horarios/Horarios-profesores/src/main/kotlin/solver/Modelos.kt)**: Modelos de dominio internos (`Leccion`, `Profesor`, `Grupo`, `Disponibilidad`).

### 4. DTOs de Transferencia (`src/main/kotlin/DTO/`)
- **[CourseDto.kt](file:///d:/Usuarios/Guillermo/Escritorio/Proyecto_horarios/Horarios-profesores/src/main/kotlin/DTO/CourseDto.kt)**, **[SubjectDto.kt](file:///d:/Usuarios/Guillermo/Escritorio/Proyecto_horarios/Horarios-profesores/src/main/kotlin/DTO/SubjectDto.kt)**, **[TeacherDto.kt](file:///d:/Usuarios/Guillermo/Escritorio/Proyecto_horarios/Horarios-profesores/src/main/kotlin/DTO/TeacherDto.kt)**, **[ScheduledClassDto.kt](file:///d:/Usuarios/Guillermo/Escritorio/Proyecto_horarios/Horarios-profesores/src/main/kotlin/DTO/ScheduledClassDto.kt)**, **[Configuracion.kt](file:///d:/Usuarios/Guillermo/Escritorio/Proyecto_horarios/Horarios-profesores/src/main/kotlin/DTO/Configuracion.kt)**: DTOs serializables JSON para comunicación con la API.

---

## 🌐 Web Project TypeScript (`Web/src/`)

El proyecto web está desarrollado en **TypeScript** y se compila con Vite a los archivos estáticos en `src/main/resources/static/`.

- **[eduschedule.html](file:///d:/Usuarios/Guillermo/Escritorio/Proyecto_horarios/Horarios-profesores/Web/src/eduschedule.html)**: Interfaz de usuario HTML5 completa con pestañas de gestión (Horario, Cursos, Asignaturas, Profesores, Prevalidación).
- **[websocket.ts](file:///d:/Usuarios/Guillermo/Escritorio/Proyecto_horarios/Horarios-profesores/Web/src/websocket.ts)**: Cliente WebSocket que recibe notificaciones del worker en tiempo real (`scores_updated`, `schedule_pushed`) y actualiza los indicadores de puntuación suave, el límite teórico (`bound`) y la lista de conflictos.
- **[index.css](file:///d:/Usuarios/Guillermo/Escritorio/Proyecto_horarios/Horarios-profesores/Web/src/index.css)**: Estilos CSS del sistema UI.
- **[types.ts](file:///d:/Usuarios/Guillermo/Escritorio/Proyecto_horarios/Horarios-profesores/Web/src/types.ts)**: Definición de interfaces TypeScript (`Teacher`, `Subject`, `Course`, `ScheduledClass`, `Config`).

---

## 🚀 Cómo Ejecutar y Probar

1. **Compilar y Ejecutar el Servidor**:
   ```bash
   ./gradlew run
   ```
2. **Ejecutar Suite de Pruebas Unitarias e Integración**:
   ```bash
   ./gradlew test --info --no-daemon
   ```
3. **Navegador**: Acceder a `http://127.0.0.1:8080`.
