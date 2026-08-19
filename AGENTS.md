# 🤖 AGENTS.md - Reglas y Estándares de Desarrollo de EduSchedule

Este archivo define las directrices obligatorias de desarrollo para cualquier Agente de Inteligencia Artificial que trabaje en el repositorio **EduSchedule**.

---

## 🎯 1. Principio Fundamental: Clean Code
1. **Nombres autoexplicativos**: Prohibido el uso de nombres genéricos (`temp`, `data`, `arr`, `obj`, `foo`). Usar nombres intencionales (`activeScheduleEvents`, `assignedTeacherMap`).
2. **Funciones pequeñas y con responsabilidad única (SRP)**: Si un método hace más de una cosa, dividirlo en sub-funciones puras y legibles.
3. **Manejo defensivo y explícito de errores**: Nunca silenciar errores en bloques `catch {}` vacíos.
4. **Legibilidad y simplicidad (KISS & DRY)**: Priorizar código claro, predecible y fácil de mantener frente a abstracciones complejas.

---

## 🧪 2. Política Obligatoria de Tests (2+ Tests por Método)
- **Por cada nuevo método, función o endpoint**: Crear como mínimo **2 tests automatizados**:
  1. **Test 1 (Camino Feliz / Happy Path)**: Verifica el resultado esperado con entradas estándar válidas.
  2. **Test 2 (Caso Borde / Límite / Error)**: Verifica la robustez ante entradas vacías, `null`/`undefined`, límites de rango o fallos controlados.
- **Suite de Tests**:
  - **Frontend**: Tests en formato ESM (`tests/*.test.mjs` o `tests/*_test.mjs`) ejecutados con `npm.cmd test`.
  - **Backend**: Tests JUnit 5 en Kotlin (`src/test/kotlin/`) ejecutados con `./gradlew.bat test`.

---

## 🛡️ 3. Política de Regresión ante Bugs y Fallos de Seguridad
- Cada vez que se detecte o repare un bug, comportamiento inesperado o fallo de seguridad:
  1. Crear un **test de regresión** que reproduzca el problema.
  2. Aplicar la solución en el código fuente.
  3. Confirmar que el test pase y conservarlo permanentemente en la suite de pruebas con nombre descriptivo o prefijo `REGRESSION:`.

---

## 🌿 4. Política de Commits Frecuentes en Git
- Realizar commits atómicos y frecuentes tras completar cada unidad lógica (función + 2 tests, bugfix + test de regresión).
- Usar el estándar **Conventional Commits**:
  - `feat: ...` para nuevas funcionalidades.
  - `fix: ...` para corrección de bugs.
  - `test: ...` para tests añadidos o actualizados.
  - `refactor: ...` para mejoras de código sin cambio de comportamiento.
  - `docs: ...` para documentación y reglas.
- Verificar que todos los tests pasen (`npm.cmd test` y `./gradlew.bat test`) antes de realizar el commit.
