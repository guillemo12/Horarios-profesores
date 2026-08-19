# E2E Test Infra: EduSchedule

## Test Philosophy
- Opaque-box, requirement-driven. Derived from `ORIGINAL_REQUEST.md` and user-facing specifications without internal white-box mock dependence.
- Methodology: Category-Partition + Boundary Value Analysis (BVA) + Pairwise Combinatorial Testing + Real-World Workload Testing.

## Feature Inventory Mapping (Tiers 1-4)
| # | Feature | Scope / Source | Tier 1 (Feature) | Tier 2 (Boundary) | Tier 3 (Pairwise) | Tier 4 (Real-World) | Test Target |
|---|---------|---------------|:----------------:|:-----------------:|:-----------------:|:-------------------:|-------------|
| F1 | CP-SAT Presolve Symmetry Tuning | Solver / M1 | ✓ | ✓ | ✓ | ✓ | `LargeSchoolStressTest.kt` |
| F2 | Solver Variable Inverted Index | Solver / M1 | ✓ | ✓ | ✓ | ✓ | `LargeSchoolStressTest.kt` |
| F3 | Pinned Class Availability Protection | Solver / M1 | ✓ | ✓ | ✓ | ✓ | `PinnedClassesSolverTest.kt` |
| F4 | Solver Memory & Object Churn Reduction | Solver / M1 | ✓ | ✓ | ✓ | ✓ | `LargeSchoolStressTest.kt` |
| F5 | SQLite Schema & Index Optimization | Database / M2 | ✓ | ✓ | ✓ | ✓ | `DatabasePerformanceAndIntegrityTest.kt` |
| F6 | Eliminate N+1 Query in Scheduled Classes | Database / M2 | ✓ | ✓ | ✓ | ✓ | `DatabasePerformanceAndIntegrityTest.kt` |
| F7 | SQLite PRAGMAs & Engine Hardening | Database / M2 | ✓ | ✓ | ✓ | ✓ | `DatabasePerformanceAndIntegrityTest.kt` |
| F8 | Atomic Database Backup & Safe Restore | Database / M2 | ✓ | ✓ | ✓ | ✓ | `DatabasePerformanceAndIntegrityTest.kt` |
| F9 | Batch Transaction & Persistence Pipeline | Database / M2 | ✓ | ✓ | ✓ | ✓ | `DatabasePerformanceAndIntegrityTest.kt`, `ConcurrencyAndStreamingTest.kt` |
| F10 | Fix DB Import Restore Bug | Frontend / M3 | ✓ | ✓ | ✓ | ✓ | `DatabasePerformanceAndIntegrityTest.kt`, `updater_test.mjs` |
| F11 | Multi-Hour Calendar Card Merging | Frontend / M3 | ✓ | ✓ | ✓ | ✓ | `tests/calendar_merge_test.mjs` |
| F12 | DOM Layout Thrashing Elimination | Frontend / M3 | ✓ | ✓ | ✓ | ✓ | `tests/print_perf_benchmark.mjs` |
| F13 | TypeScript Strict Typing & State Model | Frontend / M3 | ✓ | ✓ | ✓ | ✓ | `npm test` & esbuild bundle |
| F14 | Comprehensive E2E Testing Suite (Tiers 1-4) | E2E Track | ✓ | ✓ | ✓ | ✓ | Full Test Suite Execution |
| F15 | Large-Scale School Stress Verification | Final / M4 | ✓ | ✓ | ✓ | ✓ | `LargeSchoolStressTest.kt` |
| F16 | Multi-Duration Pinned Class Verification | Final / M4 | ✓ | ✓ | ✓ | ✓ | `PinnedClassesSolverTest.kt`, `LargeSchoolStressTest.kt` |
| F17 | Zero-Regression System Test Verification | Final / M4 | ✓ | ✓ | ✓ | ✓ | `./gradlew test --no-daemon` & `npm test` |
| F18 | Tier 5 Adversarial Coverage Hardening | Final / M4 | ✓ | ✓ | ✓ | ✓ | Challenger & Forensic Audit |

## Test Architecture & Suites
- **Backend Test Runner**: Gradle JUnit 5 (`./gradlew.bat test --no-daemon`)
- **Frontend Test Runner**: Node.js test runner (`npm test` -> `node --test tests/*.mjs`)
- **Target Test Suites**:
  1. `src/test/kotlin/PinnedClassesSolverTest.kt`
     - Pinned class preservation for single slot (30m), double slot (1h), triple slot (1.5h), and quadruple slot (2.0h).
     - Availability conflict resilience: pinned classes override teacher unavailable slots.
  2. `src/test/kotlin/PrevalidationTest.kt`
     - Pre-solve feasibility checks, structural invariants, impossible constraint diagnosis.
  3. `src/test/kotlin/LargeSchoolStressTest.kt`
     - 20+ groups, 30+ teachers, >500 classes, CP-SAT solver convergence and timeout limits (<30s).
     - Presolve and variable indexing performance verification.
  4. `src/test/kotlin/DatabasePerformanceAndIntegrityTest.kt`
     - SQLite WAL mode, PRAGMAs (`foreign_keys=ON`, `busy_timeout=10000`, `synchronous=NORMAL`, `cache_size=-64000`).
     - Schema indexes on `ClaseTable`, `RepartoDocenteTable`, `GruposTable`, `AsignaturaTable`.
     - ScheduledClasses single-query batch projection verification (O(1) query count).
     - Full database backup (`VACUUM INTO`) and import/restore round-trip with entity count and data equality verification.
  5. `src/test/kotlin/ConcurrencyAndStreamingTest.kt`
     - Multi-threaded REST request handling without deadlocks or SQLite `SQLITE_BUSY` errors.
     - WebSocket live progress streaming conflation and non-blocking backpressure handling.
  6. `tests/calendar_merge_test.mjs`
     - 25 test cases across 6 suites covering 30m, 1h, 1.5h, 2.0h multi-hour card merging, recess split safety, pin state propagation, and sorting.

## Real-World Application Scenarios (Tier 4)
| # | Scenario | Features Exercised | Complexity | Acceptance Metric |
|---|----------|--------------------|------------|-------------------|
| 1 | Full High School Timetabling (20+ groups, 30+ teachers, 500+ lessons) | F1-F4, F15, F16 | High | Infeasible / Feasible output produced within configured timeout (<30s), all pinned lessons preserved. |
| 2 | High-Concurrency Scheduling & Progress Streaming | F9, F12, F17 | Medium | Concurrent API requests execute safely with 0 SQLite locked errors; WS updates deliver without heap exhaustion. |
| 3 | Database Backup & Restore with Active WAL | F5-F8, F10, F17 | High | Backup created via VACUUM INTO restores completely with 100% entity equality on courses, teachers, subjects, and classes. |
| 4 | End-to-End Calendar Slot Rendering & Merging | F11, F13, F14 | Medium | 100% pass across 25 calendar merge tests with proper multi-slot merging and recess boundaries. |

## Coverage Thresholds
- **Tier 1 (Feature Coverage)**: >=5 test cases per feature covering standard operational requirements.
- **Tier 2 (Boundary & Corner Cases)**: >=5 test cases per feature covering boundary limits (empty tables, maximum groups/teachers, extreme durations 0.5h-2.0h, recess boundaries, timeout bounds).
- **Tier 3 (Cross-Feature Combinations)**: Pairwise integration tests covering concurrent DB reads during solver runs, pinned lessons with recess breaks, backup while transactions run.
- **Tier 4 (Real-World Stress)**: End-to-end multi-module workloads (20+ groups / 30+ teachers school dataset with export/import roundtrip).
