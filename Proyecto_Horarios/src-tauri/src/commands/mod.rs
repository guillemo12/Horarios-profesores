use tauri::{AppHandle, Emitter, State};
use crate::db::Database;
use crate::models::{Config, Course, PrevalidationCheck, PrevalidationResult, ScheduledClass, SolvedLessonDto, Subject, Teacher};
use crate::solver::ScheduleSolver;

#[tauri::command]
pub fn get_teachers(db: State<'_, Database>) -> Result<Vec<Teacher>, String> {
    db.get_teachers().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn save_teacher(teacher: Teacher, db: State<'_, Database>) -> Result<String, String> {
    db.save_teacher(&teacher).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_teacher(id: String, db: State<'_, Database>) -> Result<bool, String> {
    db.delete_teacher(&id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_subjects(db: State<'_, Database>) -> Result<Vec<Subject>, String> {
    db.get_subjects().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn save_subject(subject: Subject, db: State<'_, Database>) -> Result<String, String> {
    db.save_subject(&subject).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_subject(id: String, db: State<'_, Database>) -> Result<bool, String> {
    db.delete_subject(&id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_courses(db: State<'_, Database>) -> Result<Vec<Course>, String> {
    db.get_courses().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn save_course(course: Course, db: State<'_, Database>) -> Result<String, String> {
    db.save_course(&course).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_course(id: String, db: State<'_, Database>) -> Result<bool, String> {
    db.delete_course(&id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_assignment(
    course_id: String,
    group_id: String,
    subject_id: String,
    teacher_id: String,
    db: State<'_, Database>,
) -> Result<(), String> {
    db.update_assignment(&course_id, &group_id, &subject_id, &teacher_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn clear_group_assignments(group_id: String, db: State<'_, Database>) -> Result<(), String> {
    db.clear_group_assignments(&group_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn clear_course_assignments(course_id: String, db: State<'_, Database>) -> Result<(), String> {
    db.clear_course_assignments(&course_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_schedule(db: State<'_, Database>) -> Result<Vec<ScheduledClass>, String> {
    db.get_scheduled_classes().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn save_class(class_item: ScheduledClass, db: State<'_, Database>) -> Result<(), String> {
    db.save_scheduled_class(&class_item).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_class(id: String, db: State<'_, Database>) -> Result<bool, String> {
    db.delete_scheduled_class(&id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn toggle_class_pin(id: String, is_pinned: bool, db: State<'_, Database>) -> Result<bool, String> {
    db.toggle_class_pin(&id, is_pinned).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn clear_schedule(db: State<'_, Database>) -> Result<(), String> {
    db.clear_schedule().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn clear_group_schedule(group_id: String, db: State<'_, Database>) -> Result<(), String> {
    db.clear_group_schedule(&group_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_config(db: State<'_, Database>) -> Result<Config, String> {
    db.get_config().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn save_config(config: Config, db: State<'_, Database>) -> Result<(), String> {
    db.save_config(&config).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn run_prevalidation(db: State<'_, Database>) -> Result<PrevalidationResult, String> {
    let teachers = db.get_teachers().map_err(|e| e.to_string())?;
    let subjects = db.get_subjects().map_err(|e| e.to_string())?;
    let courses = db.get_courses().map_err(|e| e.to_string())?;
    let config = db.get_config().map_err(|e| e.to_string())?;

    let mut checks = Vec::new();
    let mut is_viable = true;

    // 1. Capacidad Horaria Total Docente vs Demanda
    let total_capacity: f64 = teachers.iter().map(|t| t.max_hours).sum();
    let mut total_demanded: f64 = 0.0;
    let mut unassigned_details = Vec::new();

    for course in &courses {
        for group in &course.groups {
            for s_id in &course.subjects {
                if let Some(subject) = subjects.iter().find(|s| &s.id == s_id) {
                    total_demanded += subject.hours;
                    if !group.assignments.contains_key(s_id) {
                        unassigned_details.push(format!("Grupo {} ({}): Asignatura '{}' ({:.1}h) sin docente explícito (asignada al tutor).", group.name, course.name, subject.name, subject.hours));
                    }
                }
            }
        }
    }

    if total_demanded > total_capacity {
        is_viable = false;
        checks.push(PrevalidationCheck {
            name: "Balance Horario Global".to_string(),
            status: "error".to_string(),
            message: format!("La demanda lectiva total ({:.1}h) supera la capacidad máxima de la plantilla ({:.1}h).", total_demanded, total_capacity),
            details: vec![format!("Déficit: {:.1} horas semanales", total_demanded - total_capacity)],
        });
    } else {
        checks.push(PrevalidationCheck {
            name: "Balance Horario Global".to_string(),
            status: "ok".to_string(),
            message: format!("Capacidad suficiente: plantilla ({:.1}h) cubre la demanda de los cursos ({:.1}h).", total_capacity, total_demanded),
            details: vec![],
        });
    }

    // 2. Reparto Docente y Asignaciones
    if unassigned_details.is_empty() {
        checks.push(PrevalidationCheck {
            name: "Reparto Docente Curricular".to_string(),
            status: "ok".to_string(),
            message: "Todas las asignaturas de todos los grupos tienen un docente titular asignado.".to_string(),
            details: vec![],
        });
    } else {
        checks.push(PrevalidationCheck {
            name: "Reparto Docente Curricular".to_string(),
            status: "warning".to_string(),
            message: format!("Hay {} asignaturas sin profesor explícito que se asignarán al tutor por defecto.", unassigned_details.len()),
            details: unassigned_details,
        });
    }

    // 3. Verificación de Franjas y Recreo
    let parse_time = |t_str: &str| -> i32 {
        let parts: Vec<&str> = t_str.split(':').collect();
        if parts.len() >= 2 {
            let h: i32 = parts[0].parse().unwrap_or(9);
            let m: i32 = parts[1].parse().unwrap_or(0);
            h * 60 + m
        } else {
            540
        }
    };

    let start_min = parse_time(&config.hora_inicio_clases);
    let end_min = parse_time(&config.hora_fin_clases);
    let rec_start = parse_time(&config.hora_inicio_recreo);
    let rec_end = rec_start + config.duracion_recreo;

    if end_min <= start_min || rec_start < start_min || rec_end > end_min {
        is_viable = false;
        checks.push(PrevalidationCheck {
            name: "Configuración Horaria y Recreo".to_string(),
            status: "error".to_string(),
            message: "Los horarios de inicio/fin de clases o recreo son inconsistentes.".to_string(),
            details: vec![format!("Jornada: {} - {}, Recreo: {} ({}m)", config.hora_inicio_clases, config.hora_fin_clases, config.hora_inicio_recreo, config.duracion_recreo)],
        });
    } else {
        checks.push(PrevalidationCheck {
            name: "Configuración Horaria y Recreo".to_string(),
            status: "ok".to_string(),
            message: format!("Jornada de {} a {} con recreo a las {} ({} min) configurada correctamente.", config.hora_inicio_clases, config.hora_fin_clases, config.hora_inicio_recreo, config.duracion_recreo),
            details: vec![],
        });
    }

    Ok(PrevalidationResult {
        viable: is_viable,
        checks,
    })
}

#[tauri::command]
pub fn start_solver(app: AppHandle, db: State<'_, Database>) -> Result<Vec<SolvedLessonDto>, String> {
    let solver = ScheduleSolver::new((*db).clone());
    let app_handle = app.clone();

    solver.solve(Some(move |event| {
        let _ = app_handle.emit("solver-progress", event);
    }))
}

#[tauri::command]
pub fn export_database(target_path: String, db: State<'_, Database>) -> Result<(), String> {
    db.export_backup(&target_path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn import_database(source_path: String, db: State<'_, Database>) -> Result<(), String> {
    db.import_backup(&source_path).map_err(|e| e.to_string())
}
