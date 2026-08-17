#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::process::Command;
use std::sync::{Arc, Mutex};
use tauri::Manager;

fn main() {
    // Preparamos un contenedor seguro para guardar el proceso de Ktor
    let ktor_process: Arc<Mutex<Option<std::process::Child>>> = Arc::new(Mutex::new(None));
    let ktor_process_clone = Arc::clone(&ktor_process);
    let ktor_process_setup = Arc::clone(&ktor_process);

    tauri::Builder::default()
        // El evento "setup" ocurre justo al abrir el programa
        .setup(move |app| {
            // Buscamos la carpeta de recursos empaquetada dinámicamente
            let resource_path = app.path().resource_dir().unwrap()
                .join("backend_ktor")
                .join("backend_ktor.exe");

            // Ejecutamos el servidor de forma invisible
            let child = Command::new(resource_path).spawn().ok();

            // Guardamos el proceso para poder matarlo luego
            if let Ok(mut process_lock) = ktor_process_setup.lock() {
                *process_lock = child;
            }
            Ok(())
        })
        // Interceptamos el cierre de la ventana
        .on_window_event(move |_window, event| match event {
            tauri::WindowEvent::Destroyed => {
                println!("Matando servidor Ktor...");
                if let Ok(mut process_lock) = ktor_process_clone.lock() {
                    if let Some(process) = process_lock.as_mut() {
                        let _ = process.kill();
                    }
                }
            }
            _ => {}
        })
        .run(tauri::generate_context!())
        .expect("Error al ejecutar la aplicación Tauri");
}