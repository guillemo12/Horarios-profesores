# Proyecto Web Frontend (Directorio `Web/`)

> [!IMPORTANT]
> **Instrucción crítica para futuros agentes / desarrolladores**:
> Las modificaciones del frontend de la aplicación web se deben realizar dentro del proyecto fuente TypeScript ubicado en el directorio `Web/`.

## 📁 Estructura del Proyecto Frontend (`Web/`)

- **`Web/src/websocket.ts`**: Lógica de cliente WebSocket, manejo de mensajes `scores_updated`, `schedule_pushed`, `optimization_complete`, etc.
- **`Web/src/calendar.ts`**: Integración con Toast UI Calendar v2, sincronización de vista semanal, colores por profesor y rendering de eventos.
- **`Web/src/api.ts`**: Cliente API REST (`/api/v1/scheduledClasses`, `/api/v1/teachers`, etc.).
- **`Web/src/crud.ts`**: Lógica de gestión de asignaturas, grupos y profesores.
- **`Web/src/prevalidation.ts`**: Modal y lógica del diagnóstico pre-validación.
- **`Web/src/types.ts`**: Definición de interfaces TypeScript (`ScheduledClassDto`, `Configuracion`, etc.).
- **`Web/src/eduschedule.html`**: Plantilla HTML estática principal (sincronizada con `src/main/resources/static/index.html`).
- **`Web/src/Datos.js`**: Bundle compilado de JavaScript distribuido a la aplicación Ktor (`src/main/resources/static/Datos.js`).

## 🔄 Flujo de Sincronización y Despliegue

1. **Editar Fuentes TS**: Realizar cambios en los módulos `.ts` de `Web/src/`.
2. **Compilar / Bundle**: Generar o copiar `Web/src/Datos.js` a `src/main/resources/static/Datos.js`.
3. **Servidor Ktor**: Ktor sirve los archivos web estáticos directamente desde `src/main/resources/static/`.

---
*Documento generado para guiar el desarrollo del frontend.*
