# 🤖 Servidor MCP Oficial de EduSchedule

Servidor oficial de integración **Model Context Protocol (MCP)** para **EduSchedule**, permitiendo a cualquier Asistente de IA (**Antigravity, Claude Desktop, Cursor, ChatGPT, etc.**) interactuar de forma autónoma con el sistema de horarios escolares, profesores, cursos, asignaturas y diagnósticos de viabilidad.

---

## 🛠️ Herramientas Disponibles para las IAs

| Herramienta | Descripción |
| :--- | :--- |
| `eduschedule_status` | Comprueba el estado del backend, salud y estadísticas de cursos, profesores, materias y clases. |
| `eduschedule_check_viability` | Ejecuta el diagnóstico de viabilidad (conflictos de PIN, capacidad de grupos, especialidades, sobrecarga docente y balance global). |
| `eduschedule_list_courses` | Lista todos los cursos, grupos, tutores y reparto de materias. |
| `eduschedule_save_course` | Crea o edita un curso y sus grupos. |
| `eduschedule_delete_course` | Elimina un curso por ID. |
| `eduschedule_list_teachers` | Lista todos los docentes, horas máximas, colores, especialidades y rejilla de disponibilidad. |
| `eduschedule_save_teacher` | Crea o actualiza un profesor con su jornada y especialidades. |
| `eduschedule_delete_teacher` | Elimina un profesor por ID. |
| `eduschedule_list_subjects` | Lista las asignaturas con sus horas semanales y curso asignado. |
| `eduschedule_save_subject` | Crea o actualiza una asignatura. |
| `eduschedule_delete_subject` | Elimina una asignatura por ID. |
| `eduschedule_update_assignment` | Asigna un docente a una materia de un grupo en Reparto Docente. |
| `eduschedule_get_schedule` | Consulta las clases programadas en el horario (con filtros por profesor, grupo o fijadas). |
| `eduschedule_save_class` | Añade o modifica una franja de clase (con soporte para fijar con chincheta / `isPinned: true`). |
| `eduschedule_delete_class` | Elimina una clase del horario. |
| `eduschedule_clear_group_schedule` | Borra el horario completo de un grupo específico. |
| `eduschedule_get_config` | Consulta los parámetros del algoritmo y horarios del centro escolar. |
| `eduschedule_save_config` | Ajusta los parámetros del optimizador y horarios escolares. |

---

## 🚀 Configuración en Clientes de IA

### 1. Antigravity CLI / IDE (`.agents/mcp_config.json` o `~/.gemini/config/mcp_config.json`):
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

### 2. Claude Desktop (`%APPDATA%\Claude\claude_desktop_config.json`):
```json
{
  "mcpServers": {
    "eduschedule": {
      "command": "node",
      "args": [
        "D:\\Usuarios\\guill\\Escritorio\\Horarios profesores\\mcp-server\\index.mjs"
      ]
    }
  }
}
```

---

## 🧪 Prueba Rápida desde Terminal
```powershell
node mcp-server/index.mjs
```
El servidor arrancará sobre transporte estándar `stdio` esperando mensajes JSON-RPC 2.0.
