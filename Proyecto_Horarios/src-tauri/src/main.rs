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
            let resource_dir = app.path().resource_dir().unwrap_or_else(|_| std::path::PathBuf::from("."));

            #[cfg(target_os = "windows")]
            let backend_exe = {
                let p1 = resource_dir.join("backend_ktor").join("backend_ktor.exe");
                if p1.exists() {
                    p1
                } else {
                    resource_dir.join("backend_ktor.exe")
                }
            };

            #[cfg(not(target_os = "windows"))]
            let backend_exe = {
                let p1 = resource_dir.join("backend_ktor").join("bin").join("backend_ktor");
                if p1.exists() {
                    p1
                } else {
                    let p2 = resource_dir.join("backend_ktor").join("backend_ktor");
                    if p2.exists() {
                        p2
                    } else {
                        resource_dir.join("bin").join("backend_ktor")
                    }
                }
            };

            #[cfg(unix)]
            {
                use std::os::unix::fs::PermissionsExt;
                if let Ok(metadata) = std::fs::metadata(&backend_exe) {
                    let mut perms = metadata.permissions();
                    perms.set_mode(0o755);
                    let _ = std::fs::set_permissions(&backend_exe, perms);
                }
            }

            println!("Iniciando backend desde: {:?}", backend_exe);
            let child = Command::new(&backend_exe).spawn().ok();

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