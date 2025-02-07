use tauri_plugin_deep_link::DeepLinkExt;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {

    tauri::Builder::default()
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_cors_fetch::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .setup(|app| {
            app.deep_link().on_open_url(|event| {
                            println!("deep link URLs: {:?}", event.urls());
                        });
            #[cfg(desktop)]
            app.deep_link().register("ayoto")?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}