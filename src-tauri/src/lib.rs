mod commands;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            commands::ai::create_generation_task,
            commands::ai::get_task_status,
            commands::image::split_grid_image,
            commands::image::save_image_source_to_app_debug_dir,
            commands::project::save_project,
            commands::project::load_project,
            commands::project_state::save_project_state,
            commands::project_state::load_project_state,
            commands::project_state::list_project_states,
            commands::project_state::delete_project_state,
            commands::system::get_system_info,
            commands::system::get_app_data_dir,
            commands::system::open_external_url,
            commands::update::check_for_updates,
            commands::update::download_update,
            commands::update::install_update,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
