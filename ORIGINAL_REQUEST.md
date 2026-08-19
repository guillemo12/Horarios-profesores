# Original User Request

## 2026-08-19T07:43:43Z

Conduct a comprehensive performance audit, codebase refactoring, and automated stress testing suite for EduSchedule (Kotlin Ktor backend, OR-Tools CP-SAT scheduler, SQLite database, and TypeScript web interface).

Working directory: D:/Usuarios/guill/Escritorio/Horarios profesores
Integrity mode: development

## Requirements

### R1. Solver & Constraint Engine Optimization
Profile and optimize OR-Tools CP-SAT schedule generation in OrToolsScheduleSolver.kt and Prevalidation.kt, minimizing memory allocation and reducing solver convergence time under large school constraints.

### R2. Database & API Performance Hardening
Audit SQLite query patterns across Exposed ORM tables (ClaseTable, RepartoDocenteTable, ProfesorTable), ensure proper indexing, batch transactions, and eliminate redundant queries in REST and WebSocket endpoints.

### R3. Frontend & State Refactoring
Refactor calendar rendering and event management in Web/src/ to optimize DOM manipulations, improve responsiveness during large schedule view toggles, and enforce strict type safety.

### R4. Exhaustive Automated Test Hardening
Implement automated unit, integration, and stress tests covering edge cases in schedule generation, pinned class preservation (both single and multi-hour slots), database migrations, and concurrency.

## Acceptance Criteria

### Execution & Stability
- [ ] ./gradlew test --no-daemon executes and passes all JUnit backend tests with 100% success
- [ ] npm test executes and passes all Node.js and frontend algorithm tests with 100% success
- [ ] Schedule generation for full school configurations (20+ groups, 30+ teachers) completes consistently within configured timeout limits
- [ ] Pinned classes of any duration (30m, 1h, 1.5h) remain strictly preserved and unmoved by the CP-SAT solver
- [ ] Zero regressions in database backup/import endpoints and WebSocket live streaming
