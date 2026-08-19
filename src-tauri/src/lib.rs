mod oauth;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![
      oauth::drive_oauth,
      oauth::drive_refresh,
      oauth::drive_userinfo
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
