#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use discord_rich_presence::{activity::{Activity, Party, Assets, Button}, DiscordIpc, DiscordIpcClient};

fn main() -> Result<(), Box<dyn std::error::Error>> {

    let mut client = DiscordIpcClient::new("1334161510120816680")?;

    client.connect()?;

    let activity = Activity::new()
        .state("test")
        .details("test")
        //.party(Party::new().size([1, 4]))
        .assets(Assets::new()
            .large_image("large_image")
            .large_text("╰(*°▽°*)╯")
        )
        .buttons(vec![Button::new(
            "Jetzt Mitschauen!",
            "ayoto://join_party",
        )]);

    client.set_activity(activity)?;

    tauri::Builder::default()
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_cors_fetch::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .run(tauri::generate_context!())
        .expect("failed to run app");

    ayoto_lib::run();

    Ok(())
}