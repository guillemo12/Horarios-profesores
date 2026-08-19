# Project: EduSchedule Performance Audit, Codebase Refactoring & Stress Testing

## Architecture
EduSchedule is a cross-platform school schedule management and automated optimization system:
- **Backend Server**: Kotlin 2.1, Ktor 3.0 on JVM 21 (Temurin), Exposed ORM, SQLite DB, Google OR-Tools CP-SAT Solver 9.8.
- **Frontend Client**: Modern TypeScript, Tailwind CSS, Toast UI Calendar, esbuild compilation targeting `src/main/resources/static/Datos.js`.
- **Desktop Container**: Tauri v2 (Rust container wrapping WebView2 + embedded JVM).
- **Inter-process & Network**: HTTP REST API + WebSocket real-time progress streaming for solver optimization.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| F1 | CP-SAT Presolve Symmetry Tuning | Set `symmetryLevel = 1` (or `0`) in `OrToolsScheduleSolver.kt` to eliminate 350s presolve hang on large schools | M1 | Survey (Explorer 1) |
| F2 | Solver Variable Inverted Index | Replace $O(\|T\| \times \|S\| \times \|yVars\|)$ scan with indexed maps (`varsByTeacherSubject`) in `OrToolsScheduleSolver.kt` | M1 | Survey (Explorer 1) |
| F3 | Pinned Class Availability Protection | Ensure pinned lessons are created and enforced even if teacher availability has blocked slots | M1 | Survey (Explorer 1) |
| F4 | Solver Memory & Object Churn Reduction | Replace `Triple` map allocations and throttle WebSocket solution serialization callbacks | M1 | Survey (Explorer 1) |
| F5 | SQLite Schema & Index Optimization | Add indexes on `ClaseTable`, `RepartoDocenteTable`, `GruposTable`, `AsignaturaTable` (`groupId`, `subjectId`, `teacherId`, `cursoId`) | M2 | Survey (Explorer 2) |
| F6 | Eliminate N+1 Query in Scheduled Classes | Replace lazy entity traversal with Exposed DSL column projections in `ScheduleRoutes.kt` (1,801 -> 1 query) | M2 | Survey (Explorer 2) |
| F7 | SQLite PRAGMAs & Engine Hardening | Enable WAL mode, `foreign_keys=ON`, `busy_timeout=10000`, `synchronous=NORMAL`, `cache_size=-64000` | M2 | Survey (Explorer 2) |
| F8 | Atomic Database Backup & Safe Restore | Implement `VACUUM INTO` for backup exports; safe connection teardown and WAL cleanup on restore | M2 | Survey (Explorer 2) |
| F9 | Batch Transaction & Persistence Pipeline | Implement `batchInsert` and batch deletions (`notInList`) in `WebSocketRouting.kt` and REST persistence | M2 | Survey (Explorer 2) |
| F10 | Fix DB Import Restore Bug | Fix undefined `loadAllData()` in `handleImportDatabaseFile()` in `Web/src/Datos.ts` | M3 | Survey (Explorer 3) |
| F11 | Multi-Hour Calendar Card Merging | Refactor `getMergedCalendarEvents` in `Web/src/` to support arbitrary continuous blocks (30m, 1h, 1.5h, 2.0h) | M3 | Survey (Explorer 3) |
| F12 | DOM Layout Thrashing Elimination | Replace repeated `element.innerHTML +=` in loops with DocumentFragments/batched HTML | M3 | Survey (Explorer 3) |
| F13 | TypeScript Strict Typing & State Model | Enforce strict interfaces on `AppDataState`, eliminate loose `any` casts, and verify esbuild bundle | M3 | Survey (Explorer 3) |
| F14 | Comprehensive E2E Testing Suite (Tiers 1-4) | Requirement-driven test suite covering all features, boundaries, combinations, and real-world stress | E2E Track | Survey (Explorer 3) |
| F15 | Large-Scale School Stress Verification | Automated stress tests for 20+ groups, 30+ teachers within timeout limits | M4 | Survey (Explorers 1, 3) |
| F16 | Multi-Duration Pinned Class Verification | Stress tests verifying 30m, 1h, 1.5h, 2.0h pinned class preservation across solver runs | M4 | Survey (Explorers 1, 3) |
| F17 | Zero-Regression System Test Verification | Full `./gradlew test --no-daemon` and `npm test` 100% pass verification | M4 | Survey (Explorers 1, 2, 3) |
| F18 | Tier 5 Adversarial Coverage Hardening | White-box adversarial testing, edge-case coverage audit, and integrity verification | M4 (Phase 2) | Orchestrator Strategy |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| E2E | E2E Testing Track | Requirement-driven opaque-box test suite (Tiers 1-4) published via `TEST_READY.md` | none | IN_PROGRESS |
| M1 | Solver & Constraint Engine Optimization | F1, F2, F3, F4 (Presolve symmetry, inverted indexes, pinned availability guard, memory reduction) | none | IN_PROGRESS |
| M2 | Database & API Performance Hardening | F5, F6, F7, F8, F9 (SQLite indexing, N+1 query elimination, WAL PRAGMAs, backup/restore, batching) | none | IN_PROGRESS |
| M3 | Frontend & State Refactoring | F10, F11, F12, F13 (Import bug fix, multi-hour merge, DOM rendering batching, TypeScript strictness, bundle) | none | IN_PROGRESS |
| M4 | Final Integration, Stress Hardening & Audit | F15, F16, F17, F18 (100% E2E test pass, large school stress tests, multi-hour pin verification, Tier 5 adversarial hardening, Forensic Audit) | E2E, M1, M2, M3 | PLANNED |

## Interface Contracts
### Solver Engine ↔ Database / Service Layer
- Input: `OptimizationConfig`, List of `Profesor`, `Grupo`, `Asignatura`, `Aula`, `Leccion` (with `isPinned`, `fixedDay`, `fixedSlot`, `fixedDurationSlots`).
- Output: `ScheduleResult(isFeasible: Boolean, classes: List<ScheduledClass>, metrics: SolverMetrics, conflicts: List<String>)`.
- Invariant: Every class with `isPinned == true` MUST have its assigned day and slot preserved identically in the output schedule.

### Backend REST & WebSocket ↔ Frontend Client
- `GET /api/v1/scheduledClasses`: returns JSON array of all scheduled classes with direct group/subject/teacher/classroom IDs in single-query response.
- `POST /api/v1/system/database/import`: accepts multi-part form `.db` file, cleanly rolls over SQLite connection, returns `{ success: true }`.
- `WS /api/v1/solver/progress`: emits stream of `{ status, progress, bestScore, currentSchedule }` without blocking JVM heap.

### Frontend Calendar Model
- `CalendarEvent`: `{ id, title, start, end, category: 'time', isPinned: boolean, raw: { ... } }`.
- Consecutive sub-slots (`_sub_2`, `_sub_3`, etc.) of the same lesson merge into single UI card of duration $N \times 30$ mins.

## Code Layout
- Backend Solver: `src/main/kotlin/solver/OrToolsScheduleSolver.kt`, `Prevalidation.kt`, `TimeSlot.kt`, `Leccion.kt`
- Backend DB & Tables: `src/main/kotlin/db/`, `models/`, `DatabaseFactory.kt`
- Backend Routing & API: `src/main/kotlin/routing/`, `WebSocketRouting.kt`
- Frontend Code: `Web/src/Datos.ts`, `calendar.ts`, `assignments.ts`, `crud.ts`, `availability.ts`, `eduschedule.html`
- Static Bundle Output: `src/main/resources/static/Datos.js`
- Backend Tests: `src/test/kotlin/`
- Frontend Tests: `tests/`
- Agent Metadata: `.agents/`
