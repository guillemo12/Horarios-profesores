---
name: clean-code-dev
description: Metodología obligatoria de Clean Code, desarrollo guiado por pruebas (mínimo 2 tests por método), política de regresión anti-bugs/seguridad y commits frecuentes en Git para el proyecto EduSchedule.
---

# 🧼 Clean Code, Testing & Git Workflow Standards

Esta **Skill** establece el estándar de ingeniería de software obligatorio para el proyecto **EduSchedule**. Define las directrices de código limpio, la política de pruebas unitarias y de regresión, y el flujo de trabajo de control de versiones con Git.

---

## 🏛️ 1. Principios de Clean Code

### 1.1. Nombres Claros y Autoexplicativos
- **Funciones y Métodos**: Verbo + Sustantivo descriptivo de la acción (`calculateTeacherWeeklyHours()`, `findConflictingTimeSlots()`, `assignTeacherToGroup()`).
- **Variables y Constantes**: Específicas y sin abreviaturas crípticas (`availableTeachers` en lugar de `tList`; `maxDurationMinutes` en lugar de `maxD`).
- **Convenciones de Nomenclatura**:
  - Kotlin / TypeScript variables y funciones: `camelCase`.
  - Clases, Interfaces y Types: `PascalCase`.
  - Constantes globales o enums: `UPPER_SNAKE_CASE`.

### 1.2. Responsabilidad Única (SRP) y Funciones Pequeñas
- Cada función debe hacer **una sola cosa** y hacerla de forma excelente.
- Si una función supera las 30-40 líneas o contiene múltiples niveles de anidación (`if`/`for`), refactorizar extrayendo funciones privadas auxiliares bien nombradas.
- Evitar efectos secundarios ocultos (*side effects*): priorizar funciones puras donde la salida dependa exclusivamente de los parámetros de entrada.

### 1.3. DRY (Don't Repeat Yourself) y KISS (Keep It Simple, Stupid)
- Centralizar la lógica común en utilidades compartidas (`utils.ts`, `TimeSlotUtils.kt`, etc.).
- Evitar sobreingeniería: la solución más sencilla, legible y mantenible siempre es superior a abstracciones innecesarias.

### 1.4. Manejo Defensivo y Explícito de Errores
- **Prohibido silenciar errores** con bloques `catch {}` vacíos sin justificación documentada.
- Validar precondiciones al inicio del método (*guard clauses* / *early returns*) para reducir la indentación.
- Registrar errores con contexto suficiente (IDs de entidad, operación intentada) para facilitar la depuración.

---

## 🧪 2. Política de Pruebas: Mínimo 2 Tests por Método

Para **cada nuevo método, función o endpoint** creado o modificado sustancialmente, se deben escribir e incorporar **como mínimo dos pruebas independientes**:

### 🎯 Test 1: Camino Feliz (Happy Path)
- Verifica el comportamiento esperado con datos de entrada estándar, válidos y representativos.
- Comprueba el valor de retorno, la mutación de estado o el código de respuesta HTTP esperado.

### 🛡️ Test 2: Caso Límite / Error / Frontera (Edge Case / Boundary Condition)
- Verifica la resiliencia del método ante situaciones adversas:
  - Colecciones vacías (`[]`, `emptyList()`).
  - Valores nulos o indefinidos (`null`, `undefined`).
  - Valores límite o fuera de rango (cero, negativos, duración máxima).
  - Claves no encontradas, colisiones de horarios o duplicados.
  - Validación de que se lancen las excepciones correctas o se devuelvan los estados de error adecuados.

---

## 🚨 3. Protocolo de Regresión ante Bugs y Fallos de Seguridad

Cuando se detecte, reporte o corrija un **bug**, excepción no controlada o **vulnerabilidad de seguridad**:

1. **Crear el Test de Reproducción Primero (TDD)**:
   - Escribir un test que reproduzca de manera fiel el escenario exacto del fallo.
   - Verificar que el test falla antes de aplicar el fix.
2. **Aplicar la Corrección Clean Code**:
   - Solucionar la causa raíz del problema sin parches temporales.
3. **Verificar que el Test Pase y Persistirlo**:
   - El test debe quedar permanentemente en la suite de pruebas del proyecto (`tests/` o `src/test/kotlin/`).
   - Nombrar el test con el prefijo `REGRESSION:` o la descripción explícita del error para evitar que el fallo vuelva a ocurrir en el futuro:
     ```kotlin
     @Test
     fun `test regression - prevent teacher double booking when placing manual pinned class over existing slot`()
     ```
     ```javascript
     test('REGRESSION-BUG: Auto-linking manual class preserves teacherId when switching groups', () => { ... });
     ```

---

## 📦 4. Guía Práctica de Testing en EduSchedule

### 🔹 A. Tests de Frontend (Node.js ESM Test Runner)
- **Ubicación**: `tests/*.test.mjs` o `tests/*_test.mjs`
- **Comando de Ejecución**: `npm.cmd test`
- **Estructura Recomendada**:
```javascript
import test from 'node:test';
import assert from 'node:assert/strict';
import { miNuevoMetodo } from '../Web/src/modulo.mjs';

test('miNuevoMetodo - Caso 1 (Happy Path): Procesa correctamente entrada válida', () => {
    const input = { id: 1, name: 'Matemáticas' };
    const result = miNuevoMetodo(input);
    assert.equal(result.success, true);
    assert.equal(result.data.name, 'Matemáticas');
});

test('miNuevoMetodo - Caso 2 (Edge Case): Maneja colecciones vacías o valores nulos sin lanzar excepción', () => {
    const resultNull = miNuevoMetodo(null);
    assert.equal(resultNull.success, false);
    assert.equal(resultNull.error, 'INVALID_INPUT');
});
```

### 🔹 B. Tests de Backend (Kotlin JUnit 5)
- **Ubicación**: `src/test/kotlin/`
- **Comando de Ejecución**: `./gradlew.bat test`
- **Estructura Recomendada**:
```kotlin
package com.colegio

import org.junit.jupiter.api.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertNotNull

class MiServicioTest {

    @Test
    fun `miNuevoMetodo - Happy Path debe calcular franjas horarias correctamente`() {
        val servicio = MiServicio()
        val resultado = servicio.calcularFranjas(duracionMinutos = 60)
        assertNotNull(resultado)
        assertEquals(2, resultado.size)
    }

    @Test
    fun `miNuevoMetodo - Edge Case debe lanzar excepcion ante duracion negativa o cero`() {
        val servicio = MiServicio()
        assertFailsWith<IllegalArgumentException> {
            servicio.calcularFranjas(duracionMinutos = -30)
        }
    }
}
```

---

## 🌿 5. Política de Commits Frecuentes y Atómicos (Git)

### 5.1. Frecuencia de Commits
- **Hacer commit frecuentemente**: No acumular múltiples características o refactorizaciones masivas sin commitear.
- Realizar un commit tan pronto como una unidad lógica de trabajo (nueva función + sus 2 tests, corrección de bug + su test de regresión, o refactor) esté terminada y verifique todos los tests con éxito.

### 5.2. Formato de Conventional Commits
Usar mensajes de commit estructurados y claros:

| Prefijo | Cuándo Usar | Ejemplo |
| :--- | :--- | :--- |
| `feat:` | Nueva funcionalidad o método | `feat(calendar): auto-vincular profesor en clases creadas manualmente` |
| `fix:` | Corrección de un error o bug | `fix(solver): resolver colisión de horarios en docentes compartidos` |
| `test:` | Adición o actualización de pruebas | `test: agregar 2 tests unitarios para merge de bloques y test de regresion` |
| `refactor:` | Mejora de código sin cambiar funcionalidad | `refactor(Datos.ts): modularizar manejadores de eventos del modal` |
| `perf:` | Optimización de rendimiento | `perf(print): acelerar generacion de PDF con busquedas Map O(1)` |
| `docs:` | Actualización de documentación | `docs: documentar estandares de clean code y flujo de testing` |
| `chore:` | Tareas de configuración, scripts o build | `chore: actualizar dependencias y configuracion de gradle` |

### 5.3. Checklist Pre-Commit
Antes de realizar cualquier commit:
1. ✅ El código sigue las pautas de Clean Code (nombres claros, funciones pequeñas, sin código muerto).
2. ✅ Se han creado al menos **2 tests** por cada método nuevo/modificado.
3. ✅ Si es un bugfix, se ha incluido el **test de regresión** correspondiente.
4. ✅ Todos los tests pasan exitosamente:
   - Frontend: `npm.cmd test`
   - Backend: `./gradlew.bat test`
5. ✅ El bundle compilado (`Datos.js`) está actualizado si hubo cambios en TypeScript.

---

## 🏷️ 6. Política de Creación de Versiones y Releases
- **NO crear ni subir tags de versión (`v*`) por cada cambio o commit.**
- Los cambios se integran en la rama principal (`master`) mediante commits atómicos.
- Las versiones / releases solo deben empaquetarse, etiquetarse con tag y publicarse cuando el usuario lo solicite expresamente.
