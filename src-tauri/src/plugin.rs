use serde::{Deserialize, Serialize};
use async_trait::async_trait;
use std::collections::HashMap;

/// Represents an anime entry
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Anime {
    pub id: String,
    pub title: String,
    pub description: String,
    pub thumbnail_url: String,
    pub episodes: Vec<Episode>,
}

/// Represents an episode of an anime
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Episode {
    pub number: u32,
    pub title: String,
    pub stream_url: String,
    pub thumbnail_url: Option<String>,
}

/// Trait that all anime provider plugins must implement
#[async_trait]
pub trait AnimeProvider: Send + Sync {
    /// Get the name of the provider
    fn name(&self) -> &str;
    
    /// Get the version of the provider
    fn version(&self) -> &str;
    
    /// Search for anime by title
    async fn search(&self, query: &str) -> Result<Vec<Anime>, Box<dyn std::error::Error>>;
    
    /// Get details for a specific anime
    async fn get_anime(&self, id: &str) -> Result<Anime, Box<dyn std::error::Error>>;
    
    /// Get streaming URL for a specific episode
    async fn get_stream_url(&self, anime_id: &str, episode: u32) -> Result<String, Box<dyn std::error::Error>>;
}

/// Plugin manager for handling anime providers
pub struct PluginManager {
    providers: HashMap<String, Box<dyn AnimeProvider>>,
}

impl PluginManager {
    pub fn new() -> Self {
        Self {
            providers: HashMap::new(),
        }
    }
    
    /// Register a new provider
    pub fn register_provider(&mut self, provider: Box<dyn AnimeProvider>) {
        let name = provider.name().to_string();
        self.providers.insert(name, provider);
    }
    
    /// Get a provider by name
    pub fn get_provider(&self, name: &str) -> Option<&Box<dyn AnimeProvider>> {
        self.providers.get(name)
    }
    
    /// List all registered providers
    pub fn list_providers(&self) -> Vec<String> {
        self.providers.keys().cloned().collect()
    }
    
    /// Search across all providers
    pub async fn search_all(&self, query: &str) -> HashMap<String, Vec<Anime>> {
        let mut results = HashMap::new();
        
        for (name, provider) in &self.providers {
            if let Ok(anime_list) = provider.search(query).await {
                results.insert(name.clone(), anime_list);
            }
        }
        
        results
    }
}

impl Default for PluginManager {
    fn default() -> Self {
        Self::new()
    }
}
