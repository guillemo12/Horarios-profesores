use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct TeacherAvailability {
    pub day_of_week: i32,
    pub start_time: String,
    pub end_time: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Teacher {
    pub id: String,
    pub name: String,
    #[serde(rename = "maxHours")]
    pub max_hours: f64,
    pub color: String,
    pub subjects: Vec<String>,
    #[serde(default)]
    pub availability: Option<Vec<TeacherAvailability>>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Subject {
    pub id: String,
    pub name: String,
    pub hours: f64,
    pub course_id: String,
    #[serde(default)]
    pub teachers: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Group {
    pub id: String,
    pub name: String,
    #[serde(rename = "tutorId")]
    pub tutor_id: Option<String>,
    #[serde(default)]
    pub assignments: HashMap<String, String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Course {
    pub id: String,
    pub name: String,
    #[serde(default)]
    pub subjects: Vec<String>,
    #[serde(default)]
    pub groups: Vec<Group>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ScheduledClass {
    pub id: String,
    pub start: String,
    pub end: String,
    pub duration: f64,
    pub subject_id: String,
    pub group_id: String,
    pub teacher_id: String,
    #[serde(rename = "isPinned", default)]
    pub is_pinned: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Config {
    #[serde(default = "default_true")]
    pub priorizar_tutor: bool,
    #[serde(default = "default_tiempo_minimo")]
    pub tiempo_minimo: i32,
    #[serde(default = "default_tiempo_maximo")]
    pub tiempo_maximo: i32,
    #[serde(default = "default_minutos_maximos")]
    pub minutos_maximos_profesor: i32,
    #[serde(default = "default_puntos_tutor")]
    pub priorizar_tutor_puntos: i32,
    #[serde(default = "default_puntos_bloques")]
    pub fomentar_bloques_60_puntos: i32,
    #[serde(default = "default_true")]
    pub minimizar_asignaturas_distintas: bool,
    #[serde(default = "default_puntos_asig")]
    pub minimizar_asignaturas_puntos: i32,
    #[serde(default = "default_limite_tiempo")]
    pub limite_tiempo_segundos: f64,
    #[serde(default = "default_estancamiento")]
    pub tiempo_estancamiento_segundos: f64,
    #[serde(default = "default_inicio_clases")]
    pub hora_inicio_clases: String,
    #[serde(default = "default_fin_clases")]
    pub hora_fin_clases: String,
    #[serde(default = "default_inicio_recreo")]
    pub hora_inicio_recreo: String,
    #[serde(default = "default_duracion_recreo")]
    pub duracion_recreo: i32,
    #[serde(default = "default_true")]
    pub respetar_especialidad: bool,
    #[serde(default = "default_true")]
    pub respetar_limite_horas: bool,
    #[serde(default = "default_true")]
    pub respetar_disponibilidad: bool,
}

fn default_true() -> bool { true }
fn default_tiempo_minimo() -> i32 { 30 }
fn default_tiempo_maximo() -> i32 { 60 }
fn default_minutos_maximos() -> i32 { 1500 }
fn default_puntos_tutor() -> i32 { 100 }
fn default_puntos_bloques() -> i32 { 10 }
fn default_puntos_asig() -> i32 { 50 }
fn default_limite_tiempo() -> f64 { 18000.0 }
fn default_estancamiento() -> f64 { 60.0 }
fn default_inicio_clases() -> String { "09:00".to_string() }
fn default_fin_clases() -> String { "14:00".to_string() }
fn default_inicio_recreo() -> String { "12:00".to_string() }
fn default_duracion_recreo() -> i32 { 30 }

impl Default for Config {
    fn default() -> Self {
        Self {
            priorizar_tutor: true,
            tiempo_minimo: 30,
            tiempo_maximo: 60,
            minutos_maximos_profesor: 1500,
            priorizar_tutor_puntos: 100,
            fomentar_bloques_60_puntos: 10,
            minimizar_asignaturas_distintas: true,
            minimizar_asignaturas_puntos: 50,
            limite_tiempo_segundos: 18000.0,
            tiempo_estancamiento_segundos: 60.0,
            hora_inicio_clases: "09:00".to_string(),
            hora_fin_clases: "14:00".to_string(),
            hora_inicio_recreo: "12:00".to_string(),
            duracion_recreo: 30,
            respetar_especialidad: true,
            respetar_limite_horas: true,
            respetar_disponibilidad: true,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct PrevalidationCheck {
    pub name: String,
    pub status: String,
    pub message: String,
    pub details: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct PrevalidationResult {
    pub viable: bool,
    pub checks: Vec<PrevalidationCheck>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct SolvedLessonDto {
    pub id: String,
    pub subject_id: String,
    pub group_id: String,
    pub teacher_id: String,
    pub day_of_week: i32,
    pub start_time: String,
    pub end_time: String,
    pub duration: f64,
    pub is_pinned: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct SolverProgressEvent {
    pub soft_score: i64,
    pub is_feasible: bool,
    pub conflicts: Vec<String>,
    pub solved_lessons: Vec<SolvedLessonDto>,
    pub progress_percent: f64,
}
