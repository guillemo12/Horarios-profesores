#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::io::Write;
use std::path::PathBuf;
use std::process::Command;
use std::sync::{Arc, Mutex};
use tauri::Manager;

fn log(msg: &str) {
    if let Ok(current_exe) = std::env::current_exe() {
        if let Some(exe_dir) = current_exe.parent() {
            let log_file = exe_dir.join("tauri_debug.log");
            if let Ok(mut f) = std::fs::OpenOptions::new().create(true).append(true).open(log_file) {
                let timestamp = std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .map(|d| d.as_secs())
                    .unwrap_or(0);
                let _ = writeln!(f, "[{}] {}", timestamp, msg);
            }
        }
    }
}

fn clean_path(path: &std::path::Path) -> PathBuf {
    let s = path.to_string_lossy();
    if let Some(stripped) = s.strip_prefix(r"\\?\UNC\") {
        PathBuf::from(format!(r"\\{}", stripped))
    } else if let Some(stripped) = s.strip_prefix(r"\\?\") {
        PathBuf::from(stripped)
    } else {
        path.to_path_buf()
    }
}

struct BackendConfig {
    exe: PathBuf,
    args: Vec<String>,
    working_dir: PathBuf,
}

fn find_backend_config(resource_dir: &std::path::Path) -> Option<BackendConfig> {
    let resource_dir = clean_path(resource_dir);
    let mut search_dirs = Vec::new();

    // 1. resource_dir variants
    search_dirs.push(resource_dir.join("backend_ktor"));
    search_dirs.push(resource_dir.join("resources").join("backend_ktor"));
    search_dirs.push(resource_dir.to_path_buf());

    // 2. current_exe directory variants
    if let Ok(current_exe) = std::env::current_exe() {
        let current_exe = clean_path(&current_exe);
        if let Some(exe_dir) = current_exe.parent() {
            search_dirs.push(exe_dir.join("backend_ktor"));
            search_dirs.push(exe_dir.join("resources").join("backend_ktor"));
            search_dirs.push(exe_dir.to_path_buf());
        }
    }

    // 3. dev / relative paths
    search_dirs.push(PathBuf::from("backend_ktor"));
    search_dirs.push(PathBuf::from("Proyecto_Horarios").join("src-tauri").join("backend_ktor"));

    for dir in &search_dirs {
        #[cfg(target_os = "windows")]
        let javaw_candidates = [
            dir.join("runtime").join("bin").join("javaw.exe"),
            dir.join("runtime").join("bin").join("java.exe"),
        ];
        #[cfg(not(target_os = "windows"))]
        let javaw_candidates = [
            dir.join("runtime").join("bin").join("java"),
            dir.join("runtime").join("bin").join("javaw"),
        ];

        let jar_candidates = [
            dir.join("horarios-profesores-all.jar"),
            dir.join("app").join("horarios-profesores-all.jar"),
        ];

        for java_exe in &javaw_candidates {
            if java_exe.exists() {
                for jar in &jar_candidates {
                    if jar.exists() {
                        log(&format!("Encontrado runtime Java: {:?} con jar: {:?}", java_exe, jar));
                        return Some(BackendConfig {
                            exe: java_exe.clone(),
                            args: vec!["-jar".to_string(), jar.to_string_lossy().to_string()],
                            working_dir: dir.clone(),
                        });
                    }
                }
            }
        }

        #[cfg(target_os = "windows")]
        let native_launcher = dir.join("backend_ktor.exe");
        #[cfg(not(target_os = "windows"))]
        let native_launcher = dir.join("bin").join("backend_ktor");

        if native_launcher.exists() {
            log(&format!("Encontrado launcher nativo: {:?}", native_launcher));
            return Some(BackendConfig {
                exe: native_launcher,
                args: vec![],
                working_dir: dir.clone(),
            });
        }
    }

    None
}

fn wait_for_server(addr: &str, timeout_secs: u64) -> bool {
    let start = std::time::Instant::now();
    let timeout = std::time::Duration::from_secs(timeout_secs);
    while start.elapsed() < timeout {
        if std::net::TcpStream::connect(addr).is_ok() {
            log(&format!("Servidor detectado en {}", addr));
            return true;
        }
        std::thread::sleep(std::time::Duration::from_millis(100));
    }
    log(&format!("Timeout esperando servidor en {}", addr));
    false
}

fn main() {
    #[cfg(target_os = "windows")]
    {
        std::env::set_var(
            "WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS",
            "--enable-gpu-rasterization --enable-zero-copy --ignore-gpu-blocklist --disable-features=CalculateNativeWinOcclusion,msEdgeEfficiencyMode,IntensiveWakeUpThrottling --disable-background-timer-throttling --disable-renderer-backgrounding",
        );
    }

    std::panic::set_hook(Box::new(|info| {
        log(&format!("PANIC OCURRIDO: {:?}", info));
    }));
    log("Iniciando función main()...");
    let ktor_process: Arc<Mutex<Option<std::process::Child>>> = Arc::new(Mutex::new(None));
    let ktor_process_clone = Arc::clone(&ktor_process);
    let ktor_process_setup = Arc::clone(&ktor_process);

    tauri::Builder::default()
        .setup(move |app| {
            log("Dentro de setup()...");
            let resource_dir = app.path().resource_dir().unwrap_or_else(|_| PathBuf::from("."));
            log(&format!("resource_dir obtenido: {:?}", resource_dir));

            if let Some(config) = find_backend_config(&resource_dir) {
                log(&format!("Iniciando backend: {:?} con args: {:?} en dir: {:?}", config.exe, config.args, config.working_dir));
                
                #[cfg(unix)]
                {
                    use std::os::unix::fs::PermissionsExt;
                    if let Ok(metadata) = std::fs::metadata(&config.exe) {
                        let mut perms = metadata.permissions();
                        perms.set_mode(0o755);
                        let _ = std::fs::set_permissions(&config.exe, perms);
                    }
                }

                let mut cmd = Command::new(&config.exe);
                cmd.args(&config.args);
                cmd.current_dir(&config.working_dir);

                match cmd.spawn() {
                    Ok(child) => {
                        let pid = child.id();
                        log(&format!("Backend Ktor iniciado con PID: {}", pid));
                        if let Ok(mut process_lock) = ktor_process_setup.lock() {
                            *process_lock = Some(child);
                        }

                        if wait_for_server("127.0.0.1:8080", 15) {
                            log("Ktor respondiendo exitosamente en 127.0.0.1:8080");
                        } else {
                            log("AVISO: Timeout esperando respuesta de Ktor en 127.0.0.1:8080");
                        }
                    }
                    Err(e) => {
                        log(&format!("Error al ejecutar cmd.spawn() para backend: {:?}", e));
                    }
                }
            } else {
                log("ERROR: No se encontró runtime de Java ni backend_ktor en ninguna ruta candidata!");
            }

            Ok(())
        })
        .on_window_event(move |_window, event| match event {
            tauri::WindowEvent::CloseRequested { .. } => {
                log("Evento CloseRequested recibido, cerrando backend Ktor...");
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