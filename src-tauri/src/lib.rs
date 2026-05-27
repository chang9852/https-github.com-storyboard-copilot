mod commands;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            commands::ai::create_generation_task,
            commands::ai::get_task_status,
            commands::image::split_grid_image,
            commands::project::save_project,
            commands::project::load_project,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
