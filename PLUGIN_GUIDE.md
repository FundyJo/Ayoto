# Plugin Development Guide for Ayoto

This guide will help you create anime provider plugins for Ayoto.

## Overview

Ayoto uses a plugin-based architecture that allows developers to add support for different anime sources. Each plugin implements the `AnimeProvider` trait and can be dynamically registered with the application.

## Plugin Architecture

### Core Components

1. **AnimeProvider Trait**: The interface all plugins must implement
2. **Plugin Manager**: Handles registration and management of providers
3. **Data Models**: Standardized structures for anime data

## Creating Your First Plugin

### Step 1: Set Up Your Provider Structure

Create a new file in `src-tauri/src/providers/` for your provider:

```rust
// src-tauri/src/providers/my_provider.rs

use crate::plugin::{Anime, AnimeProvider, Episode};
use async_trait::async_trait;
use reqwest;

pub struct MyAnimeProvider {
    name: String,
    version: String,
    api_base_url: String,
    client: reqwest::Client,
}

impl MyAnimeProvider {
    pub fn new() -> Self {
        Self {
            name: "My Anime Provider".to_string(),
            version: "1.0.0".to_string(),
            api_base_url: "https://api.example.com".to_string(),
            client: reqwest::Client::new(),
        }
    }
}
```

### Step 2: Implement the AnimeProvider Trait

```rust
#[async_trait]
impl AnimeProvider for MyAnimeProvider {
    fn name(&self) -> &str {
        &self.name
    }
    
    fn version(&self) -> &str {
        &self.version
    }
    
    async fn search(&self, query: &str) -> Result<Vec<Anime>, Box<dyn std::error::Error>> {
        // Make HTTP request to your anime source API
        let url = format!("{}/search?q={}", self.api_base_url, query);
        let response = self.client.get(&url).send().await?;
        
        // Parse the response
        let data: Vec<ApiAnimeResponse> = response.json().await?;
        
        // Convert to Ayoto's Anime format
        let anime_list = data.into_iter()
            .map(|item| self.convert_to_anime(item))
            .collect();
        
        Ok(anime_list)
    }
    
    async fn get_anime(&self, id: &str) -> Result<Anime, Box<dyn std::error::Error>> {
        // Fetch detailed anime information
        let url = format!("{}/anime/{}", self.api_base_url, id);
        let response = self.client.get(&url).send().await?;
        let data: ApiAnimeDetail = response.json().await?;
        
        Ok(self.convert_to_anime_with_episodes(data))
    }
    
    async fn get_stream_url(&self, anime_id: &str, episode: u32) -> Result<String, Box<dyn std::error::Error>> {
        // Get the streaming URL for a specific episode
        let url = format!("{}/anime/{}/episode/{}/stream", self.api_base_url, anime_id, episode);
        let response = self.client.get(&url).send().await?;
        let data: StreamResponse = response.json().await?;
        
        Ok(data.stream_url)
    }
}
```

### Step 3: Add Helper Methods

```rust
impl MyAnimeProvider {
    fn convert_to_anime(&self, api_data: ApiAnimeResponse) -> Anime {
        Anime {
            id: api_data.id,
            title: api_data.title,
            description: api_data.description,
            thumbnail_url: api_data.image_url,
            episodes: vec![], // Episodes loaded separately
        }
    }
    
    fn convert_to_anime_with_episodes(&self, api_data: ApiAnimeDetail) -> Anime {
        Anime {
            id: api_data.id,
            title: api_data.title,
            description: api_data.description,
            thumbnail_url: api_data.image_url,
            episodes: api_data.episodes.into_iter()
                .map(|ep| Episode {
                    number: ep.number,
                    title: ep.title,
                    stream_url: ep.stream_url,
                    thumbnail_url: Some(ep.thumbnail_url),
                })
                .collect(),
        }
    }
}

// Define your API response structures
#[derive(serde::Deserialize)]
struct ApiAnimeResponse {
    id: String,
    title: String,
    description: String,
    image_url: String,
}

#[derive(serde::Deserialize)]
struct ApiAnimeDetail {
    id: String,
    title: String,
    description: String,
    image_url: String,
    episodes: Vec<ApiEpisode>,
}

#[derive(serde::Deserialize)]
struct ApiEpisode {
    number: u32,
    title: String,
    stream_url: String,
    thumbnail_url: String,
}

#[derive(serde::Deserialize)]
struct StreamResponse {
    stream_url: String,
}
```

### Step 4: Register Your Plugin

1. Add your provider to the module exports in `src-tauri/src/providers/mod.rs`:

```rust
pub mod example;
pub mod my_provider;

pub use example::ExampleProvider;
pub use my_provider::MyAnimeProvider;
```

2. Register it in `src-tauri/src/main.rs`:

```rust
use providers::{ExampleProvider, MyAnimeProvider};

// In main()
let mut plugin_manager = PluginManager::new();
plugin_manager.register_provider(Box::new(ExampleProvider::new()));
plugin_manager.register_provider(Box::new(MyAnimeProvider::new()));
```

## Data Models

### Anime

```rust
pub struct Anime {
    pub id: String,              // Unique identifier
    pub title: String,           // Anime title
    pub description: String,     // Synopsis/description
    pub thumbnail_url: String,   // Cover image URL
    pub episodes: Vec<Episode>,  // List of episodes
}
```

### Episode

```rust
pub struct Episode {
    pub number: u32,                  // Episode number
    pub title: String,                // Episode title
    pub stream_url: String,           // Streaming URL
    pub thumbnail_url: Option<String>, // Optional thumbnail
}
```

## Best Practices

### 1. Error Handling

Always handle errors gracefully:

```rust
async fn search(&self, query: &str) -> Result<Vec<Anime>, Box<dyn std::error::Error>> {
    let response = self.client.get(&url)
        .send()
        .await
        .map_err(|e| format!("Network error: {}", e))?;
    
    if !response.status().is_success() {
        return Err(format!("API error: {}", response.status()).into());
    }
    
    let data = response.json().await
        .map_err(|e| format!("Parse error: {}", e))?;
    
    Ok(data)
}
```

### 2. Caching

Implement caching to reduce API calls:

```rust
use std::collections::HashMap;
use tokio::sync::RwLock;

pub struct MyAnimeProvider {
    // ... other fields
    cache: RwLock<HashMap<String, Anime>>,
}

impl MyAnimeProvider {
    async fn get_anime(&self, id: &str) -> Result<Anime, Box<dyn std::error::Error>> {
        // Check cache first
        {
            let cache = self.cache.read().await;
            if let Some(anime) = cache.get(id) {
                return Ok(anime.clone());
            }
        }
        
        // Fetch from API
        let anime = self.fetch_anime_from_api(id).await?;
        
        // Store in cache
        {
            let mut cache = self.cache.write().await;
            cache.insert(id.to_string(), anime.clone());
        }
        
        Ok(anime)
    }
}
```

### 3. Rate Limiting

Respect API rate limits:

```rust
use tokio::time::{sleep, Duration};

impl MyAnimeProvider {
    async fn make_request(&self, url: &str) -> Result<Response, Box<dyn std::error::Error>> {
        // Add delay between requests
        sleep(Duration::from_millis(100)).await;
        
        let response = self.client.get(url).send().await?;
        Ok(response)
    }
}
```

### 4. Configuration

Support configuration options:

```rust
pub struct MyAnimeProvider {
    config: ProviderConfig,
}

pub struct ProviderConfig {
    api_key: Option<String>,
    max_results: usize,
    language: String,
}

impl MyAnimeProvider {
    pub fn new_with_config(config: ProviderConfig) -> Self {
        Self {
            config,
            // ... other fields
        }
    }
}
```

### 5. Logging

Add logging for debugging:

```rust
use log::{info, warn, error};

async fn search(&self, query: &str) -> Result<Vec<Anime>, Box<dyn std::error::Error>> {
    info!("Searching for anime: {}", query);
    
    match self.fetch_results(query).await {
        Ok(results) => {
            info!("Found {} results", results.len());
            Ok(results)
        }
        Err(e) => {
            error!("Search failed: {}", e);
            Err(e)
        }
    }
}
```

## Testing Your Plugin

### Unit Tests

```rust
#[cfg(test)]
mod tests {
    use super::*;
    
    #[tokio::test]
    async fn test_search() {
        let provider = MyAnimeProvider::new();
        let results = provider.search("test").await.unwrap();
        assert!(!results.is_empty());
    }
    
    #[tokio::test]
    async fn test_get_anime() {
        let provider = MyAnimeProvider::new();
        let anime = provider.get_anime("test-id").await.unwrap();
        assert_eq!(anime.id, "test-id");
    }
}
```

### Integration Tests

```rust
#[tokio::test]
async fn test_full_workflow() {
    let provider = MyAnimeProvider::new();
    
    // Search
    let results = provider.search("naruto").await.unwrap();
    assert!(!results.is_empty());
    
    // Get details
    let anime = provider.get_anime(&results[0].id).await.unwrap();
    assert!(!anime.episodes.is_empty());
    
    // Get stream URL
    let url = provider.get_stream_url(&anime.id, 1).await.unwrap();
    assert!(url.starts_with("http"));
}
```

## Example Providers

### Simple REST API Provider

```rust
pub struct SimpleProvider {
    client: reqwest::Client,
}

impl SimpleProvider {
    pub fn new() -> Self {
        Self {
            client: reqwest::Client::new(),
        }
    }
}

#[async_trait]
impl AnimeProvider for SimpleProvider {
    fn name(&self) -> &str { "Simple Provider" }
    fn version(&self) -> &str { "1.0.0" }
    
    async fn search(&self, query: &str) -> Result<Vec<Anime>, Box<dyn std::error::Error>> {
        let url = format!("https://api.example.com/anime/search?q={}", query);
        let response = self.client.get(&url).send().await?;
        let data: Vec<Anime> = response.json().await?;
        Ok(data)
    }
    
    // ... implement other methods
}
```

### GraphQL Provider

```rust
pub struct GraphQLProvider {
    client: reqwest::Client,
    endpoint: String,
}

impl GraphQLProvider {
    async fn query(&self, query: &str, variables: serde_json::Value) -> Result<serde_json::Value, Box<dyn std::error::Error>> {
        let body = serde_json::json!({
            "query": query,
            "variables": variables
        });
        
        let response = self.client
            .post(&self.endpoint)
            .json(&body)
            .send()
            .await?;
        
        let data: serde_json::Value = response.json().await?;
        Ok(data)
    }
}

#[async_trait]
impl AnimeProvider for GraphQLProvider {
    async fn search(&self, query: &str) -> Result<Vec<Anime>, Box<dyn std::error::Error>> {
        let gql_query = r#"
            query SearchAnime($search: String) {
                anime(search: $search) {
                    id
                    title
                    description
                    coverImage
                }
            }
        "#;
        
        let variables = serde_json::json!({ "search": query });
        let result = self.query(gql_query, variables).await?;
        
        // Parse and convert result
        Ok(vec![])
    }
}
```

## Security Considerations

1. **Input Validation**: Always validate and sanitize user inputs
2. **HTTPS Only**: Use HTTPS for all external API calls
3. **API Keys**: Store API keys securely (environment variables, config files)
4. **Content Verification**: Verify content sources to prevent malicious URLs
5. **Error Messages**: Don't expose sensitive information in error messages

## Common Issues and Solutions

### Issue: API Rate Limiting

**Solution**: Implement exponential backoff:

```rust
async fn retry_with_backoff<F, T>(&self, mut f: F) -> Result<T, Box<dyn std::error::Error>>
where
    F: FnMut() -> Pin<Box<dyn Future<Output = Result<T, Box<dyn std::error::Error>>> + Send>>,
{
    let mut retries = 0;
    let max_retries = 3;
    
    loop {
        match f().await {
            Ok(result) => return Ok(result),
            Err(e) if retries < max_retries => {
                retries += 1;
                let delay = Duration::from_secs(2u64.pow(retries));
                sleep(delay).await;
            }
            Err(e) => return Err(e),
        }
    }
}
```

### Issue: Parsing Different Response Formats

**Solution**: Use flexible parsing with `serde_json::Value`:

```rust
async fn parse_flexible(&self, response: reqwest::Response) -> Result<Vec<Anime>, Box<dyn std::error::Error>> {
    let json: serde_json::Value = response.json().await?;
    
    let anime_array = json["data"]["results"]
        .as_array()
        .or_else(|| json["results"].as_array())
        .ok_or("No results array found")?;
    
    // Parse anime from array
    Ok(vec![])
}
```

## Resources

- [Tauri Documentation](https://tauri.app/v1/guides/)
- [Rust Async Book](https://rust-lang.github.io/async-book/)
- [reqwest Documentation](https://docs.rs/reqwest/)
- [serde Documentation](https://serde.rs/)

## Support

For questions or issues with plugin development:
- Open an issue on GitHub
- Check existing provider implementations in `src-tauri/src/providers/`
- Review the example provider for reference

## License

Plugins should be compatible with Ayoto's MIT license.