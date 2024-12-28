use actix_web::{web, App, HttpRequest, HttpResponse, HttpServer, Result};
use env_logger::Builder;
use log::{info, warn, LevelFilter};
use reqwest::{Client, header};
use std::env;
use tokio::task;  // Make sure tokio::task is used to spawn tasks
use url::Url; // Add `url` crate to handle URL validation and manipulation

pub async fn cors_proxy(req: HttpRequest, body: web::Bytes) -> Result<HttpResponse> {
    let url = match req.match_info().get("url") {
        Some(url) => url,
        None => {
            return {
                warn!("Bad request: not valid url specified");
                Ok(HttpResponse::BadRequest().finish())
            }
        }
    };

    // Ensure the URL has a valid scheme (http:// or https://)
    let full_url = if url.starts_with("http://") || url.starts_with("https://") {
        url.to_string()
    } else {
        format!("http://{}", url)  // Default to http:// if no scheme is provided
    };

    // Try to parse the full URL to ensure it's valid
    let parsed_url = Url::parse(&full_url);
    match parsed_url {
        Ok(_) => info!("Forwarding request to {}", full_url),
        Err(_) => {
            warn!("Bad request: invalid URL specified");
            return Ok(HttpResponse::BadRequest().finish());
        }
    }

    let client = Client::new();

    // Determine the HTTP method
    let method = match *req.method() {
        actix_web::http::Method::GET => reqwest::Method::GET,
        actix_web::http::Method::POST => reqwest::Method::POST,
        actix_web::http::Method::PUT => reqwest::Method::PUT,
        actix_web::http::Method::DELETE => reqwest::Method::DELETE,
        _ => {
            return {
                warn!("Bad request: not valid HTTP method specified");
                Ok(HttpResponse::MethodNotAllowed().finish())
            }
        }
    };

    // Set the headers, including User-Agent
    let mut headers = header::HeaderMap::new();
    headers.insert(
        header::USER_AGENT,
        header::HeaderValue::from_static("Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36 Edg/131.0.0.0")
    );

    // Forward the request to the specified URL with the custom headers
    let response = client
        .request(method, &full_url)  // Use the full URL here
        .headers(headers)  // Include the custom headers
        .body(body.to_vec())
        .send()
        .await
        .unwrap();

    // Get the Content-Type header from the response
    let content_type = response
        .headers()
        .get(reqwest::header::CONTENT_TYPE)
        .map(|header| header.to_str().unwrap())
        .unwrap_or("application/json");

    // Create a new response with the response body and appropriate headers
    Ok(HttpResponse::Ok()
        .append_header(("Access-Control-Allow-Origin", "*"))
        .append_header(("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS"))
        .append_header(("Access-Control-Allow-Headers", "Content-Type"))
        .append_header(("Access-Control-Max-Age", "3600"))
        .append_header(("Content-Type", content_type))
        .body(response.bytes().await.unwrap()))
}

pub async fn launch_proxy() -> std::io::Result<()> {
    // Set up logger based on the environment variable
    let logging_enabled = env::var("LOGGING_ENABLED")
        .map(|val| val == "true")
        .unwrap_or(false);

    if logging_enabled {
        Builder::new().filter_level(LevelFilter::Info).init();
    }

    // Get the port from the environment variable or use the default value 8080
    let port = env::var("PORT")
        .map(|val| val.parse().unwrap_or(8080))
        .unwrap_or(8080);

    let address = env::var("ADDRESS")
        .unwrap_or("127.0.0.1".to_string())
        .to_string();

    // Use Actix's default runtime to run the server
    task::spawn(async move {
        HttpServer::new(|| {
            App::new().service(
                web::resource("/{url:.+}")
                    .route(web::get().to(cors_proxy))
                    .route(web::post().to(cors_proxy))
                    .route(web::put().to(cors_proxy))
                    .route(web::delete().to(cors_proxy)),
            )
        })
            .bind((address, port))
            .unwrap()
            .run()
            .await
            .unwrap();
    }).await.unwrap();

    Ok(())
}