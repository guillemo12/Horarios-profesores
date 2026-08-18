---
name: eduschedule-dev
description: Guía completa y manual operativo para ejecutar, depurar, compilar y probar cada componente del proyecto EduSchedule (Backend Kotlin Ktor, Frontend TypeScript, Contenedor Desktop Tauri v2 y Base de Datos SQLite).
---

# EduSchedule Development & Execution Guide

Este documento es la **Skill oficial del proyecto EduSchedule** para desarrolladores y agentes de IA. Describe la arquitectura, dependencias y los comandos exactos para ejecutar, probar y compilar cada componente de forma individual o conjunta.

---

## 🏛️ 1. Arquitectura del Proyecto

EduSchedule es una aplicación de escritorio multiplataforma con arquitectura desacoplada:

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
                         │  - Exposed ORM                                │
                         │  - Google OR-Tools CP-SAT Solver              │
                         │  - SQLite Database (%APPDATA%/EduSchedule)    │
                         └───────────────────────────────────────────────┘
```

---

## 💻 2. Cómo Ejecutar Cada Componente

### 🌐 A. Frontend (TypeScript + HTML + Tailwind CSS)
- **Ubicación**: `Web/src/`
- **Archivos Clave**:
  - `Web/src/eduschedule.html` (interfaz de usuario principal)
  - `Web/src/Datos.ts` (lógica cliente, peticiones fetch, calendario y gestión)
  - `Web/src/updater.ts` (módulo de comprobación y actualización en 1 clic)
- **Destino del Bundle**: `src/main/resources/static/Datos.js`

#### Comandos de Compilación:
```powershell
# 1. Empaquetar TypeScript a JavaScript minificado con esbuild:
& "C:\Program Files\nodejs\npx.cmd" esbuild Web/src/Datos.ts --bundle --outfile=src/main/resources/static/Datos.js --minify --sourcemap --target=es2020

# 2. Copiar a la carpeta estática para desarrollo local de Deno:
Copy-Item "src\main\resources\static\Datos.js" -Destination "Web\src\Datos.js" -Force
```

#### Modo Watch (Recompilación automática al guardar cambios):
```powershell
& "C:\Program Files\nodejs\npx.cmd" esbuild Web/src/Datos.ts --bundle --outfile=src/main/resources/static/Datos.js --watch
```

---

### ⚙️ B. Backend (Kotlin + Ktor + Exposed + OR-Tools)
- **Ubicación**: `src/main/kotlin/`
- **Requisitos**: JDK 21 (Temurin / Eclipse Adoptium)
- **Puerto por defecto**: `http://localhost:8080`

#### Comandos de Ejecución y Pruebas:
```powershell
# 1. Iniciar el servidor backend en modo desarrollo:
./gradlew.bat run

# 2. Ejecutar la suite completa de pruebas unitarias y de integración:
./gradlew.bat test --no-daemon

# 3. Ejecutar sólo los tests del sistema y base de datos:
./gradlew.bat test --tests "com.colegio.SystemAndDatabaseTest" --no-daemon

# 4. Generar el Fat JAR ejecutable (ShadowJar):
./gradlew.bat shadowJar --no-daemon
# (Salida en: build/libs/horarios-profesores-all.jar)
```

---

### 🦀 C. Contenedor de Escritorio (Tauri v2 / Rust)
- **Ubicación**: `Proyecto_Horarios/src-tauri/`
- **Requisitos**: Rust toolchain (`cargo`), Node.js / Deno.

#### Comandos de Desarrollo:
```powershell
# 1. Modo desarrollo interactivo (lanza la ventana de Tauri conectada a localhost:8080):
cd Proyecto_Horarios/src-tauri
cargo tauri dev
```

#### Comandos de Compilación Release (Instaladores NSIS / MSI):
```powershell
cd Proyecto_Horarios/src-tauri
cargo tauri build
# (Salida en: Proyecto_Horarios/src-tauri/target/release/bundle/nsis/ y bundle/msi/)
```

---

### 📦 D. Compilación del Ejecutable Único Portable (`EduSchedule_Unico.exe`)
Empaqueta todo el backend, frontend, runtime JRE de Java y binario de Tauri en un único archivo ejecutable autónomo.

```powershell
# 1. Empaquetar frontend:
& "C:\Program Files\nodejs\npx.cmd" esbuild Web/src/Datos.ts --bundle --outfile=src/main/resources/static/Datos.js --minify --sourcemap --target=es2020

# 2. Construir Fat JAR:
./gradlew.bat shadowJar --no-daemon

# 3. Construir runtime JRE mínimo con jlink:
if (Test-Path "Proyecto_Horarios\src-tauri\backend_ktor") { Remove-Item "Proyecto_Horarios\src-tauri\backend_ktor" -Recurse -Force }
New-Item -ItemType Directory -Path "Proyecto_Horarios\src-tauri\backend_ktor" -Force
Copy-Item "build\libs\horarios-profesores-all.jar" -Destination "Proyecto_Horarios\src-tauri\backend_ktor\horarios-profesores-all.jar" -Force
jlink --add-modules java.se,jdk.unsupported,jdk.crypto.ec,jdk.crypto.mscapi,jdk.zipfs,jdk.charsets,jdk.localedata,jdk.management --output "Proyecto_Horarios\src-tauri\backend_ktor\runtime" --strip-debug --no-man-pages --no-header-files

# 4. Compilar Tauri release:
cd Proyecto_Horarios/src-tauri
cargo tauri build
cd ../..

# 5. Generar paquete portable y compilar el wrapper C#:
if (Test-Path "dist\EduSchedule") { Remove-Item "dist\EduSchedule" -Recurse -Force }
New-Item -ItemType Directory -Path "dist\EduSchedule" -Force
Copy-Item "Proyecto_Horarios\src-tauri\target\release\eduschedule.exe" -Destination "dist\EduSchedule\EduSchedule.exe" -Force
Copy-Item "Proyecto_Horarios\src-tauri\target\release\backend_ktor" -Destination "dist\EduSchedule\backend_ktor" -Recurse -Force
powershell -ExecutionPolicy Bypass -File .\build_single_exe.ps1
```

---

## 🗄️ 3. Base de Datos SQLite y Rutas

- **Ubicación en Windows**: `%APPDATA%\EduSchedule\colegio.db`
- **Ubicación en Linux**: `~/.eduschedule/colegio.db`
- **Sobrescritura personalizada** (para tests o depuración):
  - Propiedad de sistema: `-Deduschedule.db.path=C:\mi_ruta\custom.db`
  - Variable de entorno: `EDUSCHEDULE_DB_PATH=C:\mi_ruta\custom.db`

### Endpoints del Sistema (Copias de Seguridad y Actualizaciones):
- `GET /api/v1/system/database/export`: Descarga copia de seguridad `.db`.
- `POST /api/v1/system/database/import`: Restaura base de datos `.db` desde archivo subido.
- `POST /api/v1/system/update/install`: Descarga e instala nueva versión en 1 solo clic.

---

---

## 🤖 5. Servidor MCP (Model Context Protocol para IAs)

EduSchedule incluye un servidor **MCP oficial** en `mcp-server/index.mjs` para que agentes de IA (**Antigravity, Claude, Cursor, ChatGPT**) puedan consultar y modificar el sistema:

### Configuración (`.agents/mcp_config.json` o `~/.gemini/config/mcp_config.json`):
```json
{
  "mcpServers": {
    "eduschedule": {
      "command": "node",
      "args": [
        "D:\\Usuarios\\guill\\Escritorio\\Horarios profesores\\mcp-server\\index.mjs"
      ],
      "env": {
        "EDUSCHEDULE_API_URL": "http://127.0.0.1:8080/api/v1"
      }
    }
  }
}
```

### Herramientas MCP Disponibles:
- `eduschedule_status`: Estado, salud y conteo de entidades.
- `eduschedule_check_viability`: Diagnóstico de 5 puntos de viabilidad del colegio.
- `eduschedule_list_courses`, `eduschedule_save_course`, `eduschedule_delete_course`: Gestión de cursos y grupos.
- `eduschedule_list_teachers`, `eduschedule_save_teacher`, `eduschedule_delete_teacher`: Gestión de profesores.
- `eduschedule_list_subjects`, `eduschedule_save_subject`, `eduschedule_delete_subject`: Gestión de asignaturas.
- `eduschedule_update_assignment`: Asignación de docentes en Reparto Docente.
- `eduschedule_get_schedule`, `eduschedule_save_class` (soporta `isPinned: true`), `eduschedule_delete_class`: Gestión del horario escolar.
- `eduschedule_get_config`, `eduschedule_save_config`: Configuración del optimizador.

---

## ⚠️ 6. Problemas Frecuentes y Soluciones

1. **Rutas extendidas de Windows (`\\?\`) en Rust**:
   - `std::fs::canonicalize()` en Windows añade `\\?\`, lo que impide que Java reconozca los argumentos `-jar`.
   - Utilizar siempre la función [`clean_path()`](file:///D:/Usuarios/guill/Escritorio/Horarios%20profesores/Proyecto_Horarios/src-tauri/src/main.rs) definida en `main.rs`.
2. **Error `PSSecurityException` con npm/npx en PowerShell**:
   - Usar la ruta explícita al comando cmd: `& "C:\Program Files\nodejs\npx.cmd" ...`.
3. **Bloqueos de compilación de Tauri**:
   - Asegurarse de que no haya instancias previas de `eduschedule.exe` o `javaw.exe` en ejecución en el Administrador de Tareas.

