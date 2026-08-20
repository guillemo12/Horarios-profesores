pub mod models;
pub mod db;
pub mod commands;
pub mod solver;

#[cfg(test)]
pub mod tests;

use db::Database;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    #[cfg(target_os = "windows")]
    {
        std::env::set_var(
            "WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS",
            "--enable-gpu-rasterization --enable-zero-copy --ignore-gpu-blocklist --disable-features=CalculateNativeWinOcclusion,msEdgeEfficiencyMode,IntensiveWakeUpThrottling --disable-background-timer-throttling --disable-renderer-backgrounding",
        );
    }

    let database = Database::init(None::<&str>).expect("Error inicializando la base de datos SQLite");

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(database)
        .invoke_handler(tauri::generate_handler![
            commands::get_teachers,
            commands::save_teacher,
            commands::delete_teacher,
            commands::get_subjects,
            commands::save_subject,
            commands::delete_subject,
            commands::get_courses,
            commands::save_course,
            commands::delete_course,
            commands::update_assignment,
            commands::clear_group_assignments,
            commands::clear_course_assignments,
            commands::get_schedule,
            commands::save_class,
            commands::delete_class,
            commands::toggle_class_pin,
            commands::clear_schedule,
            commands::clear_group_schedule,
            commands::get_config,
            commands::save_config,
            commands::run_prevalidation,
            commands::start_solver,
            commands::export_database,
            commands::import_database,
        ])
        .run(tauri::generate_context!())
        .expect("Error ejecutando la aplicación Tauri");
}
