use tauri::{AppHandle, Emitter, State};
use crate::db::Database;
use crate::models::{Config, Course, PrevalidationResult, ScheduledClass, SolvedLessonDto, Subject, Teacher};
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

    let total_capacity: f64 = teachers.iter().map(|t| t.max_hours).sum();
    let mut total_demanded: f64 = 0.0;
    let mut unassigned_hours: f64 = 0.0;
    let mut critical_errors = Vec::new();
    let mut warnings = Vec::new();
    let mut recommendations = Vec::new();

    for course in &courses {
        for group in &course.groups {
            for s_id in &course.subjects {
                if let Some(subject) = subjects.iter().find(|s| &s.id == s_id) {
                    total_demanded += subject.hours;
                    if !group.assignments.contains_key(s_id) {
                        unassigned_hours += subject.hours;
                        warnings.push(format!("El grupo {} en {} tiene la asignatura '{}' sin profesor asignado.", group.name, course.name, subject.name));
                    }
                }
            }
        }
    }

    if total_demanded > total_capacity {
        critical_errors.push(format!(
            "La demanda total de horas ({:.1}h) supera la capacidad máxima de la plantilla ({:.1}h).",
            total_demanded, total_capacity
        ));
    }

    if unassigned_hours > 0.0 {
        recommendations.push(format!(
            "Hay {:.1} horas lectivas sin reparto docente explícito que usarán al tutor por defecto.",
            unassigned_hours
        ));
    }

    let is_viable = critical_errors.is_empty();

    Ok(PrevalidationResult {
        is_viable,
        total_demanded_hours: total_demanded,
        total_teacher_capacity_hours: total_capacity,
        unassigned_subject_hours: unassigned_hours,
        critical_errors,
        warnings,
        recommendations,
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
