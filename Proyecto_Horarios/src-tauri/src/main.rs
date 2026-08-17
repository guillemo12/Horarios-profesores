#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::path::PathBuf;
use std::process::Command;
use std::sync::{Arc, Mutex};
use tauri::Manager;

fn find_backend_executable(resource_dir: &std::path::Path) -> Option<PathBuf> {
    let mut candidates = Vec::new();

    #[cfg(target_os = "windows")]
    {
        // 1. resource_dir variants
        candidates.push(resource_dir.join("backend_ktor").join("backend_ktor.exe"));
        candidates.push(resource_dir.join("resources").join("backend_ktor").join("backend_ktor.exe"));
        candidates.push(resource_dir.join("backend_ktor.exe"));

        // 2. current_exe directory variants
        if let Ok(current_exe) = std::env::current_exe() {
            if let Some(exe_dir) = current_exe.parent() {
                candidates.push(exe_dir.join("backend_ktor").join("backend_ktor.exe"));
                candidates.push(exe_dir.join("resources").join("backend_ktor").join("backend_ktor.exe"));
                candidates.push(exe_dir.join("backend_ktor.exe"));
            }
        }

        // 3. relative / dev paths
        candidates.push(PathBuf::from("backend_ktor").join("backend_ktor.exe"));
        candidates.push(PathBuf::from("Proyecto_Horarios").join("src-tauri").join("backend_ktor").join("backend_ktor.exe"));
    }

    #[cfg(not(target_os = "windows"))]
    {
        // 1. resource_dir variants
        candidates.push(resource_dir.join("backend_ktor").join("bin").join("backend_ktor"));
        candidates.push(resource_dir.join("backend_ktor").join("backend_ktor"));
        candidates.push(resource_dir.join("resources").join("backend_ktor").join("bin").join("backend_ktor"));
        candidates.push(resource_dir.join("resources").join("backend_ktor").join("backend_ktor"));
        candidates.push(resource_dir.join("bin").join("backend_ktor"));

        // 2. current_exe directory variants
        if let Ok(current_exe) = std::env::current_exe() {
            if let Some(exe_dir) = current_exe.parent() {
                candidates.push(exe_dir.join("backend_ktor").join("bin").join("backend_ktor"));
                candidates.push(exe_dir.join("backend_ktor").join("backend_ktor"));
                candidates.push(exe_dir.join("resources").join("backend_ktor").join("bin").join("backend_ktor"));
                candidates.push(exe_dir.join("resources").join("backend_ktor").join("backend_ktor"));
            }
        }

        // 3. relative / dev paths
        candidates.push(PathBuf::from("backend_ktor").join("bin").join("backend_ktor"));
        candidates.push(PathBuf::from("backend_ktor").join("backend_ktor"));
        candidates.push(PathBuf::from("Proyecto_Horarios").join("src-tauri").join("backend_ktor").join("bin").join("backend_ktor"));
    }

    candidates.into_iter().find(|p| p.exists())
}

fn main() {
    let ktor_process: Arc<Mutex<Option<std::process::Child>>> = Arc::new(Mutex::new(None));
    let ktor_process_clone = Arc::clone(&ktor_process);
    let ktor_process_setup = Arc::clone(&ktor_process);

    tauri::Builder::default()
        .setup(move |app| {
            let resource_dir = app.path().resource_dir().unwrap_or_else(|_| PathBuf::from("."));

            if let Some(backend_exe) = find_backend_executable(&resource_dir) {
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
                let mut cmd = Command::new(&backend_exe);
                
                // Establecer el directorio de trabajo donde reside el ejecutable
                // para que el runtime embebido de Java (jpackage) encuentre lib/runtime/app
                if let Some(parent) = backend_exe.parent() {
                    cmd.current_dir(parent);
                }

                match cmd.spawn() {
                    Ok(child) => {
                        println!("Backend Ktor iniciado correctamente (PID: {})", child.id());
                        if let Ok(mut process_lock) = ktor_process_setup.lock() {
                            *process_lock = Some(child);
                        }
                    }
                    Err(e) => {
                        eprintln!("Error al iniciar el proceso backend: {:?}", e);
                    }
                }
            } else {
                eprintln!("No se encontró el ejecutable backend_ktor en ninguna de las rutas candidatas.");
            }

            Ok(())
        })
        .on_window_event(move |_window, event| match event {
            tauri::WindowEvent::Destroyed => {
                println!("Matando servidor Ktor...");
                if let Ok(mut process_lock) = ktor_process_clone.lock() {
                    if let Some(mut process) = process_lock.take() {
                        let _ = process.kill();
                    }
                }
            }
            _ => {}
        })
        .run(tauri::generate_context!())
        .expect("Error al ejecutar la aplicación Tauri");
}