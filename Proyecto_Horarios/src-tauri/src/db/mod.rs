use rusqlite::{params, Connection, Result};
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};
use crate::models::{Config, Course, Group, ScheduledClass, Subject, Teacher, TeacherAvailability};

#[derive(Clone)]
pub struct Database {
    conn: Arc<Mutex<Connection>>,
    db_path: PathBuf,
}

impl Database {
    pub fn init<P: AsRef<Path>>(custom_path: Option<P>) -> Result<Self> {
        let db_path = match custom_path {
            Some(p) => p.as_ref().to_path_buf(),
            None => Self::resolve_default_db_path(),
        };

        if let Some(parent) = db_path.parent() {
            let _ = std::fs::create_dir_all(parent);
        }

        let conn = Connection::open(&db_path)?;
        conn.execute_batch(
            "PRAGMA journal_mode = WAL;
             PRAGMA foreign_keys = ON;
             PRAGMA synchronous = NORMAL;"
        )?;

        let db = Self {
            conn: Arc::new(Mutex::new(conn)),
            db_path,
        };

        db.create_tables_if_not_exist()?;
        db.seed_if_empty()?;

        Ok(db)
    }

    pub fn resolve_default_db_path() -> PathBuf {
        if let Ok(path_str) = std::env::var("EDUSCHEDULE_DB_PATH") {
            return PathBuf::from(path_str);
        }

        #[cfg(target_os = "windows")]
        {
            if let Some(app_data) = dirs::data_dir() {
                return app_data.join("com.guill.eduschedule").join("eduschedule.db");
            }
        }

        #[cfg(not(target_os = "windows"))]
        {
            if let Some(config_dir) = dirs::config_dir() {
                return config_dir.join("eduschedule").join("eduschedule.db");
            }
        }

        PathBuf::from("eduschedule.db")
    }

    pub fn get_path(&self) -> PathBuf {
        self.db_path.clone()
    }

    pub fn create_tables_if_not_exist(&self) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute_batch(
            "CREATE TABLE IF NOT EXISTS profesor (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nombre TEXT NOT NULL,
                minutos_maximos INTEGER NOT NULL,
                color TEXT NOT NULL DEFAULT '#4f46e5',
                disponibilidad TEXT NOT NULL DEFAULT '[]'
            );

            CREATE TABLE IF NOT EXISTS curso (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nombre TEXT NOT NULL UNIQUE
            );

            CREATE TABLE IF NOT EXISTS grupos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                curso_id INTEGER NOT NULL,
                nombre TEXT NOT NULL,
                profesor_id INTEGER NOT NULL,
                FOREIGN KEY (curso_id) REFERENCES curso(id) ON DELETE CASCADE,
                FOREIGN KEY (profesor_id) REFERENCES profesor(id) ON DELETE RESTRICT,
                UNIQUE(curso_id, nombre)
            );

            CREATE TABLE IF NOT EXISTS asignatura (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nombre TEXT NOT NULL,
                minutos INTEGER NOT NULL,
                curso_id INTEGER NOT NULL,
                FOREIGN KEY (curso_id) REFERENCES curso(id) ON DELETE CASCADE,
                UNIQUE(nombre, curso_id)
            );

            CREATE TABLE IF NOT EXISTS profesor_asignatura (
                profesor_id INTEGER NOT NULL,
                asignatura_id INTEGER NOT NULL,
                PRIMARY KEY (profesor_id, asignatura_id),
                FOREIGN KEY (profesor_id) REFERENCES profesor(id) ON DELETE CASCADE,
                FOREIGN KEY (asignatura_id) REFERENCES asignatura(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS reparto_docente (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                profesor_id INTEGER NOT NULL,
                asignatura_id INTEGER NOT NULL,
                grupo_id INTEGER NOT NULL,
                FOREIGN KEY (profesor_id) REFERENCES profesor(id) ON DELETE CASCADE,
                FOREIGN KEY (asignatura_id) REFERENCES asignatura(id) ON DELETE CASCADE,
                FOREIGN KEY (grupo_id) REFERENCES grupos(id) ON DELETE CASCADE,
                UNIQUE(grupo_id, asignatura_id)
            );

            CREATE TABLE IF NOT EXISTS clase_programada (
                id TEXT PRIMARY KEY,
                start_time TEXT NOT NULL,
                end_time TEXT NOT NULL,
                duration REAL NOT NULL,
                subject_id INTEGER NOT NULL,
                group_id INTEGER NOT NULL,
                teacher_id INTEGER NOT NULL,
                is_pinned INTEGER NOT NULL DEFAULT 0,
                FOREIGN KEY (subject_id) REFERENCES asignatura(id) ON DELETE CASCADE,
                FOREIGN KEY (group_id) REFERENCES grupos(id) ON DELETE CASCADE,
                FOREIGN KEY (teacher_id) REFERENCES profesor(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS tabla_configuracion (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                priorizarTutor INTEGER NOT NULL DEFAULT 0,
                tiempo_minimo INTEGER NOT NULL DEFAULT 30,
                tiempo_maximo INTEGER NOT NULL DEFAULT 60,
                minutos_maximos_profesor INTEGER NOT NULL DEFAULT 1500,
                priorizar_tutor_puntos INTEGER NOT NULL DEFAULT 100,
                fomentar_bloques_60_puntos INTEGER NOT NULL DEFAULT 10,
                minimizar_asignaturas_distintas INTEGER NOT NULL DEFAULT 1,
                minimizar_asignaturas_puntos INTEGER NOT NULL DEFAULT 50,
                limite_tiempo_segundos REAL NOT NULL DEFAULT 18000.0,
                tiempo_estancamiento_segundos REAL NOT NULL DEFAULT 60.0,
                hora_inicio_clases TEXT NOT NULL DEFAULT '09:00',
                hora_fin_clases TEXT NOT NULL DEFAULT '14:00',
                hora_inicio_recreo TEXT NOT NULL DEFAULT '12:00',
                duracion_recreo INTEGER NOT NULL DEFAULT 30,
                respetar_especialidad INTEGER NOT NULL DEFAULT 1,
                respetar_limite_horas INTEGER NOT NULL DEFAULT 1,
                respetar_disponibilidad INTEGER NOT NULL DEFAULT 1
            );

            CREATE INDEX IF NOT EXISTS idx_clase_group ON clase_programada(group_id);
            CREATE INDEX IF NOT EXISTS idx_clase_teacher ON clase_programada(teacher_id);
            CREATE INDEX IF NOT EXISTS idx_clase_subject ON clase_programada(subject_id);
            CREATE INDEX IF NOT EXISTS idx_reparto_prof ON reparto_docente(profesor_id);
            CREATE INDEX IF NOT EXISTS idx_reparto_asig ON reparto_docente(asignatura_id);"
        )?;
        Ok(())
    }

    pub fn seed_if_empty(&self) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        let config_count: i64 = conn.query_row("SELECT COUNT(*) FROM tabla_configuracion", [], |r| r.get(0))?;
        if config_count == 0 {
            conn.execute(
                "INSERT INTO tabla_configuracion (
                    priorizarTutor, tiempo_minimo, tiempo_maximo, minutos_maximos_profesor,
                    priorizar_tutor_puntos, fomentar_bloques_60_puntos, minimizar_asignaturas_distintas,
                    minimizar_asignaturas_puntos, limite_tiempo_segundos, tiempo_estancamiento_segundos,
                    hora_inicio_clases, hora_fin_clases, hora_inicio_recreo, duracion_recreo,
                    respetar_especialidad, respetar_limite_horas, respetar_disponibilidad
                ) VALUES (1, 30, 60, 1500, 100, 10, 1, 50, 18000.0, 60.0, '09:00', '14:00', '12:00', 30, 1, 1, 1)",
                []
            )?;
        }

        let teacher_count: i64 = conn.query_row("SELECT COUNT(*) FROM profesor", [], |r| r.get(0))?;
        if teacher_count == 0 {
            let teachers = [
                ("Guillermo", 1500, "#4f46e5"),
                ("María López", 1500, "#059669"),
                ("Carlos Ruiz", 1500, "#d97706"),
                ("Laura Sánchez", 1500, "#dc2626"),
                ("David Fernández", 1500, "#7c3aed"),
                ("Elena Gómez", 1500, "#0891b2"),
                ("Javier Morales", 1500, "#db2777"),
                ("Lucía Vega", 1500, "#ca8a04"),
                ("Pedro Martínez", 1500, "#16a34a"),
                ("Ana Torres", 1500, "#9333ea"),
            ];
            for (name, mins, color) in teachers {
                conn.execute(
                    "INSERT INTO profesor (nombre, minutos_maximos, color, disponibilidad) VALUES (?1, ?2, ?3, '[]')",
                    params![name, mins, color],
                )?;
            }

            // Seed courses
            let courses = ["1º ESO", "2º ESO", "3º ESO", "4º ESO"];
            for c_name in courses {
                conn.execute("INSERT INTO curso (nombre) VALUES (?1)", params![c_name])?;
            }

            // Seed subjects (Total 1350 min = 22.5h semanales)
            let subjects_1eso = [
                ("Matemáticas", 210, 1),
                ("Lengua Castellana", 210, 1),
                ("Inglés", 180, 1),
                ("Geografía e Historia", 180, 1),
                ("Biología y Geología", 180, 1),
                ("Educación Física", 120, 1),
                ("Música", 120, 1),
                ("Educación Plástica", 90, 1),
                ("Tutoría", 60, 1),
            ];
            for (s_name, mins, c_id) in subjects_1eso {
                conn.execute(
                    "INSERT INTO asignatura (nombre, minutos, curso_id) VALUES (?1, ?2, ?3)",
                    params![s_name, mins, c_id],
                )?;
            }

            // Seed groups
            let groups = [
                (1, "A", 1),
                (1, "B", 2),
                (2, "A", 3),
                (2, "B", 4),
            ];
            for (c_id, g_name, tutor_id) in groups {
                let _ = conn.execute(
                    "INSERT INTO grupos (curso_id, nombre, profesor_id) VALUES (?1, ?2, ?3)",
                    params![c_id, g_name, tutor_id],
                )?;
                let last_gid = conn.last_insert_rowid();

                // Seed teacher distribution for subjects
                if c_id == 1 {
                    for s_idx in 1..=9 {
                        let prof_id = if g_name == "A" { s_idx } else { (s_idx % 10) + 1 };
                        let _ = conn.execute(
                            "INSERT OR IGNORE INTO reparto_docente (grupo_id, asignatura_id, profesor_id) VALUES (?1, ?2, ?3)",
                            params![last_gid, s_idx, prof_id],
                        );
                    }
                }
            }
        }

        Ok(())
    }

    // -------------------------------------------------------------
    // CONFIGURATION
    // -------------------------------------------------------------
    pub fn get_config(&self) -> Result<Config> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT priorizarTutor, tiempo_minimo, tiempo_maximo, minutos_maximos_profesor,
                    priorizar_tutor_puntos, fomentar_bloques_60_puntos, minimizar_asignaturas_distintas,
                    minimizar_asignaturas_puntos, limite_tiempo_segundos, tiempo_estancamiento_segundos,
                    hora_inicio_clases, hora_fin_clases, hora_inicio_recreo, duracion_recreo,
                    respetar_especialidad, respetar_limite_horas, respetar_disponibilidad
             FROM tabla_configuracion ORDER BY id LIMIT 1"
        )?;

        let config = stmt.query_row([], |row| {
            Ok(Config {
                priorizar_tutor: row.get::<_, i32>(0)? != 0,
                tiempo_minimo: row.get(1)?,
                tiempo_maximo: row.get(2)?,
                minutos_maximos_profesor: row.get(3)?,
                priorizar_tutor_puntos: row.get(4)?,
                fomentar_bloques_60_puntos: row.get(5)?,
                minimizar_asignaturas_distintas: row.get::<_, i32>(6)? != 0,
                minimizar_asignaturas_puntos: row.get(7)?,
                limite_tiempo_segundos: row.get(8)?,
                tiempo_estancamiento_segundos: row.get(9)?,
                hora_inicio_clases: row.get(10)?,
                hora_fin_clases: row.get(11)?,
                hora_inicio_recreo: row.get(12)?,
                duracion_recreo: row.get(13)?,
                respetar_especialidad: row.get::<_, i32>(14)? != 0,
                respetar_limite_horas: row.get::<_, i32>(15)? != 0,
                respetar_disponibilidad: row.get::<_, i32>(16)? != 0,
            })
        }).unwrap_or_default();

        Ok(config)
    }

    pub fn save_config(&self, cfg: &Config) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "UPDATE tabla_configuracion SET
                priorizarTutor = ?1,
                tiempo_minimo = ?2,
                tiempo_maximo = ?3,
                minutos_maximos_profesor = ?4,
                priorizar_tutor_puntos = ?5,
                fomentar_bloques_60_puntos = ?6,
                minimizar_asignaturas_distintas = ?7,
                minimizar_asignaturas_puntos = ?8,
                limite_tiempo_segundos = ?9,
                tiempo_estancamiento_segundos = ?10,
                hora_inicio_clases = ?11,
                hora_fin_clases = ?12,
                hora_inicio_recreo = ?13,
                duracion_recreo = ?14,
                respetar_especialidad = ?15,
                respetar_limite_horas = ?16,
                respetar_disponibilidad = ?17
             WHERE id = (SELECT id FROM tabla_configuracion ORDER BY id LIMIT 1)",
            params![
                if cfg.priorizar_tutor { 1 } else { 0 },
                cfg.tiempo_minimo,
                cfg.tiempo_maximo,
                cfg.minutos_maximos_profesor,
                cfg.priorizar_tutor_puntos,
                cfg.fomentar_bloques_60_puntos,
                if cfg.minimizar_asignaturas_distintas { 1 } else { 0 },
                cfg.minimizar_asignaturas_puntos,
                cfg.limite_tiempo_segundos,
                cfg.tiempo_estancamiento_segundos,
                cfg.hora_inicio_clases,
                cfg.hora_fin_clases,
                cfg.hora_inicio_recreo,
                cfg.duracion_recreo,
                if cfg.respetar_especialidad { 1 } else { 0 },
                if cfg.respetar_limite_horas { 1 } else { 0 },
                if cfg.respetar_disponibilidad { 1 } else { 0 }
            ],
        )?;
        Ok(())
    }

    // -------------------------------------------------------------
    // TEACHERS
    // -------------------------------------------------------------
    pub fn get_teachers(&self) -> Result<Vec<Teacher>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare("SELECT id, nombre, minutos_maximos, color, disponibilidad FROM profesor ORDER BY nombre ASC")?;
        let teacher_rows = stmt.query_map([], |row| {
            let id_num: i64 = row.get(0)?;
            let name: String = row.get(1)?;
            let mins: i64 = row.get(2)?;
            let color: String = row.get(3)?;
            let disp_str: String = row.get(4)?;
            let avail: Option<Vec<TeacherAvailability>> = serde_json::from_str(&disp_str).ok();

            Ok((id_num, name, (mins as f64) / 60.0, color, avail))
        })?;

        let mut teachers = Vec::new();
        for t in teacher_rows {
            let (id_num, name, max_hours, color, availability) = t?;
            let mut sub_stmt = conn.prepare("SELECT asignatura_id FROM profesor_asignatura WHERE profesor_id = ?1")?;
            let subjects: Vec<String> = sub_stmt.query_map(params![id_num], |r| {
                let s_id: i64 = r.get(0)?;
                Ok(s_id.to_string())
            })?.filter_map(|r| r.ok()).collect();

            teachers.push(Teacher {
                id: id_num.to_string(),
                name,
                max_hours,
                color,
                subjects,
                availability,
            });
        }
        Ok(teachers)
    }

    pub fn save_teacher(&self, teacher: &Teacher) -> Result<String> {
        let mut conn = self.conn.lock().unwrap();
        let tx = conn.transaction()?;
        let disp_json = serde_json::to_string(&teacher.availability.clone().unwrap_or_default()).unwrap_or_else(|_| "[]".to_string());
        let mins = (teacher.max_hours * 60.0).round() as i64;

        let teacher_id: i64 = if teacher.id.is_empty() || teacher.id == "0" {
            tx.execute(
                "INSERT INTO profesor (nombre, minutos_maximos, color, disponibilidad) VALUES (?1, ?2, ?3, ?4)",
                params![teacher.name, mins, teacher.color, disp_json],
            )?;
            tx.last_insert_rowid()
        } else {
            let id_num: i64 = teacher.id.parse().unwrap_or(0);
            tx.execute(
                "UPDATE profesor SET nombre = ?1, minutos_maximos = ?2, color = ?3, disponibilidad = ?4 WHERE id = ?5",
                params![teacher.name, mins, teacher.color, disp_json, id_num],
            )?;
            tx.execute("DELETE FROM profesor_asignatura WHERE profesor_id = ?1", params![id_num])?;
            id_num
        };

        for s_id_str in &teacher.subjects {
            if let Ok(s_id) = s_id_str.parse::<i64>() {
                tx.execute(
                    "INSERT OR IGNORE INTO profesor_asignatura (profesor_id, asignatura_id) VALUES (?1, ?2)",
                    params![teacher_id, s_id],
                )?;
            }
        }

        tx.commit()?;
        Ok(teacher_id.to_string())
    }

    pub fn delete_teacher(&self, id: &str) -> Result<bool> {
        let conn = self.conn.lock().unwrap();
        let id_num: i64 = id.parse().unwrap_or(0);
        let rows = conn.execute("DELETE FROM profesor WHERE id = ?1", params![id_num])?;
        Ok(rows > 0)
    }

    // -------------------------------------------------------------
    // SUBJECTS
    // -------------------------------------------------------------
    pub fn get_subjects(&self) -> Result<Vec<Subject>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare("SELECT id, nombre, minutos, curso_id FROM asignatura ORDER BY nombre ASC")?;
        let subject_rows = stmt.query_map([], |row| {
            let id_num: i64 = row.get(0)?;
            let name: String = row.get(1)?;
            let mins: i64 = row.get(2)?;
            let c_id: i64 = row.get(3)?;
            Ok((id_num, name, (mins as f64) / 60.0, c_id.to_string()))
        })?;

        let mut subjects = Vec::new();
        for s in subject_rows {
            let (id_num, name, hours, course_id) = s?;
            let mut prof_stmt = conn.prepare("SELECT profesor_id FROM profesor_asignatura WHERE asignatura_id = ?1")?;
            let teachers: Vec<String> = prof_stmt.query_map(params![id_num], |r| {
                let p_id: i64 = r.get(0)?;
                Ok(p_id.to_string())
            })?.filter_map(|r| r.ok()).collect();

            subjects.push(Subject {
                id: id_num.to_string(),
                name,
                hours,
                course_id,
                teachers: Some(teachers),
            });
        }
        Ok(subjects)
    }

    pub fn save_subject(&self, subject: &Subject) -> Result<String> {
        let mut conn = self.conn.lock().unwrap();
        let tx = conn.transaction()?;
        let mins = (subject.hours * 60.0).round() as i64;
        let c_id: i64 = subject.course_id.parse().unwrap_or(0);

        let subject_id: i64 = if subject.id.is_empty() || subject.id == "0" {
            tx.execute(
                "INSERT INTO asignatura (nombre, minutos, curso_id) VALUES (?1, ?2, ?3)",
                params![subject.name, mins, c_id],
            )?;
            tx.last_insert_rowid()
        } else {
            let id_num: i64 = subject.id.parse().unwrap_or(0);
            tx.execute(
                "UPDATE asignatura SET nombre = ?1, minutos = ?2, curso_id = ?3 WHERE id = ?4",
                params![subject.name, mins, c_id, id_num],
            )?;
            tx.execute("DELETE FROM profesor_asignatura WHERE asignatura_id = ?1", params![id_num])?;
            id_num
        };

        if let Some(teachers) = &subject.teachers {
            for t_id_str in teachers {
                if let Ok(t_id) = t_id_str.parse::<i64>() {
                    tx.execute(
                        "INSERT OR IGNORE INTO profesor_asignatura (profesor_id, asignatura_id) VALUES (?1, ?2)",
                        params![t_id, subject_id],
                    )?;
                }
            }
        }

        tx.commit()?;
        Ok(subject_id.to_string())
    }

    pub fn delete_subject(&self, id: &str) -> Result<bool> {
        let conn = self.conn.lock().unwrap();
        let id_num: i64 = id.parse().unwrap_or(0);
        let rows = conn.execute("DELETE FROM asignatura WHERE id = ?1", params![id_num])?;
        Ok(rows > 0)
    }

    // -------------------------------------------------------------
    // COURSES & GROUPS & ASSIGNMENTS
    // -------------------------------------------------------------
    pub fn get_courses(&self) -> Result<Vec<Course>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare("SELECT id, nombre FROM curso ORDER BY nombre ASC")?;
        let course_rows = stmt.query_map([], |row| {
            let c_id: i64 = row.get(0)?;
            let c_name: String = row.get(1)?;
            Ok((c_id, c_name))
        })?;

        let mut courses = Vec::new();
        for c in course_rows {
            let (c_id, c_name) = c?;

            // Subjects of course
            let mut s_stmt = conn.prepare("SELECT id FROM asignatura WHERE curso_id = ?1")?;
            let subjects: Vec<String> = s_stmt.query_map(params![c_id], |r| {
                let s_id: i64 = r.get(0)?;
                Ok(s_id.to_string())
            })?.filter_map(|r| r.ok()).collect();

            // Groups of course
            let mut g_stmt = conn.prepare("SELECT id, nombre, profesor_id FROM grupos WHERE curso_id = ?1 ORDER BY nombre ASC")?;
            let group_rows = g_stmt.query_map(params![c_id], |r| {
                let g_id: i64 = r.get(0)?;
                let g_name: String = r.get(1)?;
                let tutor_id: i64 = r.get(2)?;
                Ok((g_id, g_name, tutor_id))
            })?;

            let mut groups = Vec::new();
            for g in group_rows {
                let (g_id, g_name, tutor_id) = g?;

                // Teaching distribution assignments for group
                let mut a_stmt = conn.prepare("SELECT asignatura_id, profesor_id FROM reparto_docente WHERE grupo_id = ?1")?;
                let mut assignments = HashMap::new();
                let a_rows = a_stmt.query_map(params![g_id], |r| {
                    let s_id: i64 = r.get(0)?;
                    let p_id: i64 = r.get(1)?;
                    Ok((s_id.to_string(), p_id.to_string()))
                })?;
                for a in a_rows {
                    let (s_id_str, p_id_str) = a?;
                    assignments.insert(s_id_str, p_id_str);
                }

                groups.push(Group {
                    id: g_id.to_string(),
                    name: g_name,
                    tutor_id: Some(tutor_id.to_string()),
                    assignments,
                });
            }

            courses.push(Course {
                id: c_id.to_string(),
                name: c_name,
                subjects,
                groups,
            });
        }
        Ok(courses)
    }

    pub fn save_course(&self, course: &Course) -> Result<String> {
        let mut conn = self.conn.lock().unwrap();
        let tx = conn.transaction()?;

        let course_id: i64 = if course.id.is_empty() || course.id == "0" {
            tx.execute("INSERT INTO curso (nombre) VALUES (?1)", params![course.name])?;
            tx.last_insert_rowid()
        } else {
            let id_num: i64 = course.id.parse().unwrap_or(0);
            tx.execute("UPDATE curso SET nombre = ?1 WHERE id = ?2", params![course.name, id_num])?;
            id_num
        };

        // Sync groups
        for g in &course.groups {
            let tutor_id: i64 = g.tutor_id.as_deref().unwrap_or("1").parse().unwrap_or(1);
            let group_id: i64 = if g.id.is_empty() || g.id == "0" {
                tx.execute(
                    "INSERT INTO grupos (curso_id, nombre, profesor_id) VALUES (?1, ?2, ?3)",
                    params![course_id, g.name, tutor_id],
                )?;
                tx.last_insert_rowid()
            } else {
                let g_id_num: i64 = g.id.parse().unwrap_or(0);
                tx.execute(
                    "UPDATE grupos SET nombre = ?1, profesor_id = ?2 WHERE id = ?3 AND curso_id = ?4",
                    params![g.name, tutor_id, g_id_num, course_id],
                )?;
                g_id_num
            };

            // Sync assignments
            for (s_id_str, p_id_str) in &g.assignments {
                if let (Ok(s_id), Ok(p_id)) = (s_id_str.parse::<i64>(), p_id_str.parse::<i64>()) {
                    tx.execute(
                        "INSERT INTO reparto_docente (grupo_id, asignatura_id, profesor_id) VALUES (?1, ?2, ?3)
                         ON CONFLICT(grupo_id, asignatura_id) DO UPDATE SET profesor_id = excluded.profesor_id",
                        params![group_id, s_id, p_id],
                    )?;
                }
            }
        }

        tx.commit()?;
        Ok(course_id.to_string())
    }

    pub fn delete_course(&self, id: &str) -> Result<bool> {
        let conn = self.conn.lock().unwrap();
        let id_num: i64 = id.parse().unwrap_or(0);
        let rows = conn.execute("DELETE FROM curso WHERE id = ?1", params![id_num])?;
        Ok(rows > 0)
    }

    pub fn update_assignment(&self, _course_id: &str, group_id: &str, subject_id: &str, teacher_id: &str) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        let g_id: i64 = group_id.parse().unwrap_or(0);
        let s_id: i64 = subject_id.parse().unwrap_or(0);

        if teacher_id.is_empty() {
            conn.execute(
                "DELETE FROM reparto_docente WHERE grupo_id = ?1 AND asignatura_id = ?2",
                params![g_id, s_id],
            )?;
        } else {
            let t_id: i64 = teacher_id.parse().unwrap_or(0);
            conn.execute(
                "INSERT INTO reparto_docente (grupo_id, asignatura_id, profesor_id) VALUES (?1, ?2, ?3)
                 ON CONFLICT(grupo_id, asignatura_id) DO UPDATE SET profesor_id = excluded.profesor_id",
                params![g_id, s_id, t_id],
            )?;
        }
        Ok(())
    }

    pub fn clear_group_assignments(&self, group_id: &str) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        let g_id: i64 = group_id.parse().unwrap_or(0);
        conn.execute("DELETE FROM reparto_docente WHERE grupo_id = ?1", params![g_id])?;
        Ok(())
    }

    pub fn clear_course_assignments(&self, course_id: &str) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        let c_id: i64 = course_id.parse().unwrap_or(0);
        conn.execute(
            "DELETE FROM reparto_docente WHERE grupo_id IN (SELECT id FROM grupos WHERE curso_id = ?1)",
            params![c_id],
        )?;
        Ok(())
    }

    // -------------------------------------------------------------
    // SCHEDULED CLASSES
    // -------------------------------------------------------------
    pub fn get_scheduled_classes(&self) -> Result<Vec<ScheduledClass>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, start_time, end_time, duration, subject_id, group_id, teacher_id, is_pinned
             FROM clase_programada ORDER BY start_time ASC"
        )?;

        let classes = stmt.query_map([], |row| {
            let id: String = row.get(0)?;
            let start: String = row.get(1)?;
            let end: String = row.get(2)?;
            let duration: f64 = row.get(3)?;
            let subject_id: i64 = row.get(4)?;
            let group_id: i64 = row.get(5)?;
            let teacher_id: i64 = row.get(6)?;
            let is_pinned: i32 = row.get(7)?;

            Ok(ScheduledClass {
                id,
                start,
                end,
                duration,
                subject_id: subject_id.to_string(),
                group_id: group_id.to_string(),
                teacher_id: teacher_id.to_string(),
                is_pinned: is_pinned != 0,
            })
        })?.filter_map(|r| r.ok()).collect();

        Ok(classes)
    }

    pub fn save_scheduled_class(&self, cls: &ScheduledClass) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        let s_id: i64 = cls.subject_id.parse().unwrap_or(0);
        let g_id: i64 = cls.group_id.parse().unwrap_or(0);
        let t_id: i64 = cls.teacher_id.parse().unwrap_or(0);

        conn.execute(
            "INSERT INTO clase_programada (id, start_time, end_time, duration, subject_id, group_id, teacher_id, is_pinned)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
             ON CONFLICT(id) DO UPDATE SET
                start_time = excluded.start_time,
                end_time = excluded.end_time,
                duration = excluded.duration,
                subject_id = excluded.subject_id,
                group_id = excluded.group_id,
                teacher_id = excluded.teacher_id,
                is_pinned = excluded.is_pinned",
            params![cls.id, cls.start, cls.end, cls.duration, s_id, g_id, t_id, if cls.is_pinned { 1 } else { 0 }],
        )?;
        Ok(())
    }

    pub fn delete_scheduled_class(&self, id: &str) -> Result<bool> {
        let conn = self.conn.lock().unwrap();
        let rows = conn.execute("DELETE FROM clase_programada WHERE id = ?1", params![id])?;
        Ok(rows > 0)
    }

    pub fn toggle_class_pin(&self, id: &str, is_pinned: bool) -> Result<bool> {
        let conn = self.conn.lock().unwrap();
        let rows = conn.execute(
            "UPDATE clase_programada SET is_pinned = ?1 WHERE id = ?2",
            params![if is_pinned { 1 } else { 0 }, id],
        )?;
        Ok(rows > 0)
    }

    pub fn clear_schedule(&self) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM clase_programada WHERE is_pinned = 0", [])?;
        Ok(())
    }

    pub fn clear_group_schedule(&self, group_id: &str) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        let g_id: i64 = group_id.parse().unwrap_or(0);
        conn.execute("DELETE FROM clase_programada WHERE group_id = ?1", params![g_id])?;
        Ok(())
    }

    // -------------------------------------------------------------
    // BACKUP & RESTORE
    // -------------------------------------------------------------
    pub fn export_backup<P: AsRef<Path>>(&self, target_path: P) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        let mut dst = Connection::open(target_path)?;
        let backup = rusqlite::backup::Backup::new(&conn, &mut dst)?;
        backup.run_to_completion(5, std::time::Duration::from_millis(50), None)?;
        Ok(())
    }

    pub fn import_backup<P: AsRef<Path>>(&self, source_path: P) -> Result<()> {
        let mut conn = self.conn.lock().unwrap();
        let src = Connection::open(source_path)?;
        let backup = rusqlite::backup::Backup::new(&src, &mut conn)?;
        backup.run_to_completion(5, std::time::Duration::from_millis(50), None)?;
        Ok(())
    }
}
