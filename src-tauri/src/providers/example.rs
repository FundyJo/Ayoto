use crate::plugin::{Anime, AnimeProvider, Episode};
use async_trait::async_trait;

/// Example anime provider implementation
/// This demonstrates how to create a plugin for a specific anime source
pub struct ExampleProvider {
    name: String,
    version: String,
}

impl ExampleProvider {
    pub fn new() -> Self {
        Self {
            name: "Example Provider".to_string(),
            version: "1.0.0".to_string(),
        }
    }
}

impl Default for ExampleProvider {
    fn default() -> Self {
        Self::new()
    }
}

#[async_trait]
impl AnimeProvider for ExampleProvider {
    fn name(&self) -> &str {
        &self.name
    }
    
    fn version(&self) -> &str {
        &self.version
    }
    
    async fn search(&self, query: &str) -> Result<Vec<Anime>, Box<dyn std::error::Error>> {
        // In a real implementation, this would make HTTP requests to the anime source API
        // For now, we'll return mock data
        let mock_data = vec![
            Anime {
                id: "anime-1".to_string(),
                title: format!("Demo Anime matching '{}'", query),
                description: "This is a demo anime entry from the example provider".to_string(),
                thumbnail_url: "https://via.placeholder.com/300x400".to_string(),
                episodes: vec![
                    Episode {
                        number: 1,
                        title: "Episode 1: The Beginning".to_string(),
                        stream_url: "https://example.com/stream/episode1".to_string(),
                        thumbnail_url: Some("https://via.placeholder.com/300x170".to_string()),
                    },
                    Episode {
                        number: 2,
                        title: "Episode 2: The Journey Continues".to_string(),
                        stream_url: "https://example.com/stream/episode2".to_string(),
                        thumbnail_url: Some("https://via.placeholder.com/300x170".to_string()),
                    },
                ],
            },
            Anime {
                id: "anime-2".to_string(),
                title: format!("Another Demo Anime for '{}'", query),
                description: "Another demo anime entry".to_string(),
                thumbnail_url: "https://via.placeholder.com/300x400".to_string(),
                episodes: vec![
                    Episode {
                        number: 1,
                        title: "Episode 1".to_string(),
                        stream_url: "https://example.com/stream/anime2-ep1".to_string(),
                        thumbnail_url: None,
                    },
                ],
            },
        ];
        
        Ok(mock_data)
    }
    
    async fn get_anime(&self, id: &str) -> Result<Anime, Box<dyn std::error::Error>> {
        // Mock implementation
        Ok(Anime {
            id: id.to_string(),
            title: "Demo Anime".to_string(),
            description: "Full details for a demo anime".to_string(),
            thumbnail_url: "https://via.placeholder.com/300x400".to_string(),
            episodes: vec![
                Episode {
                    number: 1,
                    title: "Episode 1".to_string(),
                    stream_url: "https://example.com/stream/episode1".to_string(),
                    thumbnail_url: Some("https://via.placeholder.com/300x170".to_string()),
                },
            ],
        })
    }
    
    async fn get_stream_url(&self, anime_id: &str, episode: u32) -> Result<String, Box<dyn std::error::Error>> {
        // Mock implementation
        Ok(format!("https://example.com/stream/{}/episode{}", anime_id, episode))
    }
}
