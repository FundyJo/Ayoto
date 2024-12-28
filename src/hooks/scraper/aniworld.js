import * as cheerio from 'cheerio';
import Voe from '../parser/voe.js';
import Vidoza from '../parser/vidoza.js';
import {getRequest, getTest, postRequest} from "./bypass/cors.js";

const baseURL = 'https://aniworld.to';
//const searchCache = new NodeCache({ stdTTL: 2 * 60 * 60 });
//const popularCache = new NodeCache({ stdTTL: 4 * 60 * 60 });

const headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0"
};

import axiosAdapter from "axios-tauri-http-adapter";
import axios from "axios";

const axiosClient = axios.create({
    adapter: axiosAdapter()
})

export class Aniworld {
    static async search(keyword, page = 1, perPage = 5) {
        //const cacheKey = `${keyword}-${page}-${perPage}`;
        //const cachedResults = searchCache.get(cacheKey);
        //if (cachedResults) return cachedResults;

        //console.time(`Search Time - ${cacheKey}`);
        try {
            const searchUrl = `${baseURL}/ajax/seriesSearch?keyword=${encodeURIComponent(keyword)}`;
            console.log(`Searching for: ${keyword} on page ${page}, with ${perPage} results per page`);

            const {data: results} = await postRequest(searchUrl);
            if (!results || results.length === 0) {
                console.log('No results found.');
                return [];
            }

            const startIndex = (page - 1) * perPage;
            const endIndex = startIndex + perPage;
            const paginatedResults = results.slice(startIndex, endIndex);

            const searchResults = await Promise.allSettled(
                paginatedResults.map(async (item) => {
                    try {
                        const animeId = item.link;
                        const animePageUrl = `${baseURL}/anime/stream/${animeId}`;
                        console.log(`Fetching anime page: ${animePageUrl}`);

                        const {data: html} = await getRequest(animePageUrl);
                        const $ = cheerio.load(html);

                        const title = $("h1[itemprop='name'] span").text().trim();
                        const ratingValue = Number($("span[itemprop='ratingValue']").text()) * 10;
                        const image = `${baseURL}${item.cover}`;
                        const type = item.productionYear.includes('Filme') ? 'TV, Filme' : 'TV';

                        const seasons = $('.hosterSiteDirectNav ul:first-child li a');
                        const seasonPromises = seasons
                            .map(async (_, seasonElement) => {
                                const seasonNumber = $(seasonElement).text().trim();
                                const seasonUrl = `${baseURL}/anime/stream/${animeId}/staffel-${seasonNumber}`;
                                const {data: seasonHtml} = await getRequest(seasonUrl);
                                const episodeLinks = cheerio.load(seasonHtml)("ul:contains('Episoden')").last().find('li a');
                                return episodeLinks.length;
                            })
                            .get();

                        const totalEpisodes = await Promise.all(seasonPromises).then((results) => results.reduce((a, b) => a + b, 0));

                        return {
                            id: animeId,
                            title: {
                                romaji: title,
                                english: title,
                                native: title,
                                userPreferred: title,
                            },
                            image,
                            type,
                            totalEpisodes,
                            rating: isNaN(ratingValue) ? 0 : ratingValue,
                        };
                    } catch (error) {
                        console.error(`Error fetching anime data: ${error.message}`);
                        return null;
                    }
                })
            );

            //searchCache.set(cacheKey, filteredResults);
//
            //console.timeEnd(`Search Time - ${cacheKey}`);
            return searchResults.filter((result) => result.status === 'fulfilled').map((result) => result.value);
        } catch (error) {
            console.error(`Search error: ${error.message}`);
            console.timeEnd(`Search Time - ${cacheKey}`);
            return [];
        }
    }

    static async getPopularAnimes(page, perPage) {
        //const cacheKey = 'popular_animes';
        let cachedResults = [];

        //if (!cachedResults) {
        console.log('Cache miss: Scraping popular animes...');
        try {
            const {data: html} = await getRequest(`${baseURL}/beliebte-animes`, {headers});

            const $ = cheerio.load(html);
            const hrefs = $('div.col-md-15.col-sm-3.col-xs-6 a')
                .map((_, element) => $(element).attr('href'))
                .get()
                .filter(Boolean);

            const results = await Promise.allSettled(
                hrefs.map(async (href) => {
                    try {
                        const animePageUrl = `${baseURL}${href}`;
                        const {data: animeHtml} = await getRequest(animePageUrl, {headers});

                        const $ = cheerio.load(animeHtml);

                        const title = $("h1[itemprop='name'] span").text().trim();
                        const description = $('p.seri_des').attr('data-full-description');
                        const ratingValue = Number($("span[itemprop='ratingValue']").text()) * 10;
                        const image = `${baseURL}${$('div.seriesCoverBox img').attr('data-src')}`;

                        const seasons = $('.hosterSiteDirectNav ul:first-child li a');
                        const seasonPromises = seasons
                            .map(async (_, seasonElement) => {
                                const seasonNumber = $(seasonElement).text().trim();
                                const seasonUrl = `${baseURL}${href}/staffel-${seasonNumber}`;
                                const {data: seasonHtml} = await getRequest(seasonUrl, {headers});
                                const episodeLinks = cheerio.load(seasonHtml)("ul:contains('Episoden')").last().find('li a');
                                return episodeLinks.length;
                            })
                            .get();

                        const totalEpisodes = await Promise.all(seasonPromises).then((results) => results.reduce((a, b) => a + b, 0));
                        const id = href.split('/').pop() || '';
                        const coverImage = await this.fetchCoverImage(id);

                        return {
                            id,
                            title: {
                                romaji: title,
                                english: title,
                                native: title,
                                userPreferred: title,
                            },
                            description,
                            genres: ['Action', 'Comedy', 'Drama', 'Romance', 'Sci-Fi', 'Supernatural'],
                            releaseDate: 2024,
                            status: 'Ongoing',
                            type: 'TV',
                            rating: isNaN(ratingValue) ? 0 : ratingValue,
                            cover: coverImage,
                            totalEpisodes,
                            duration: 24,
                            color: '#e47850',
                            image,
                        };
                    } catch (error) {
                        console.error(`Error fetching anime data (${href}): ${error.message}`);
                        return null;
                    }
                })
            );

            cachedResults = results.filter((result) => result.status === 'fulfilled').map((result) => result.value);
            //popularCache.set(cacheKey, cachedResults);
            console.log('Results cached');
        } catch (error) {
            console.error(`Scraping error: ${error.message}`);
            return {
                currentPage: page,
                hasNextPage: false,
                totalPages: 0,
                totalResults: 0,
                results: [],
            };
        }
        //} else {
        //    console.log('Cache hit: Using cached results');
        //}

        const totalResults = cachedResults.length;
        const totalPages = Math.ceil(totalResults / perPage);
        const startIndex = (page - 1) * perPage;
        const endIndex = page * perPage;
        const paginatedResults = cachedResults.slice(startIndex, endIndex);
        const hasNextPage = page < totalPages;


        console.log({
            currentPage: page,
            hasNextPage,
            totalPages,
            totalResults,
            results: paginatedResults,
        });

        return {
            currentPage: page,
            hasNextPage,
            totalPages,
            totalResults,
            results: paginatedResults,
        };
    }

    static async fetchEpisodeLinks(animeId, season, episode) {
        try {

            const clean_season = season.replace("season-","");
            const clean_episode = episode.replace("episode-","")

            if (clean_season === "") {
                season = 1;
            }

            if (clean_episode === "") {
                episode = 1;
            }

            let url;
            if (season === 'filme' || season === 'Filme') {
                url = `${baseURL}/anime/stream/${animeId}/filme/film-${episode}`;
            } else {
                url = `${baseURL}/anime/stream/${animeId}/staffel-${season}/episode-${episode}`;
            }

            console.log('Loading page:', url);

            const response = await getRequest(url, { headers });
            if (!response.data) {
                console.error('Invalid data structure from page');
                return { sources: [], download: '' };
            }

            const $ = cheerio.load(response.data);
            const links = [];

            for (const element of $('ul.row li.col-md-3.col-xs-12.col-sm-6')) {
                const langKey = $(element).attr('data-lang-key');
                const hosterTitle = $(element).find('h4').text().trim();
                let href = $(element).find('a.watchEpisode').attr('href');

                if (href && (hosterTitle === 'VOE' || hosterTitle === 'Doodstream'|| hosterTitle === 'Vidoza')) {
                    const fullUrl = `${baseURL}${href}`;
                    console.log('Full URL:', fullUrl);

                    try {
                        let redirectUrl = fullUrl;
                        let directLink = redirectUrl;
                        if (hosterTitle === 'VOE') {
                            directLink = await Voe.getDirectLink(fullUrl);
                        } else if (hosterTitle === 'Doodstream') {
                            directLink = await Doodstream.getDirectLink(fullUrl);
                            //redirectUrl = redirectUrl.replace('https://doodstream.com', 'https://dood.li');
                        }else if (hosterTitle === 'Vidoza') {
                            directLink = await Vidoza.getDirectLink(redirectUrl);
                            console.log(directLink)
                        }

                        links.push({
                            language: langKey === '1' ? 'ger-dub' : langKey === '3' ? 'ger-sub' : langKey === '2' ? 'eng-sub' : 'default',
                            hoster: hosterTitle,
                            url: directLink,
                        });
                    } catch (error) {
                        console.error(`Error processing ${hosterTitle}:`, error.message);
                    }
                }
            }

            console.log({ sources: links, download: '' })
            return { sources: links, download: '' };
        } catch (error) {
            console.error('Error fetching episode links:', error);
            return { sources: [], download: '' };
        }
    }

    static async fetchEpisodes(animeId) {
        try {
            const url = `https://animecloud.tv/api/anime?slug=${animeId}`;

            console.log("ANIME EPISODE URL: ", url)

            // API-Anfrage mit fetch durchführen
            const response = await getRequest(url);

            // Überprüfen, ob die Antwort korrekt ist und die benötigten Daten vorhanden sind
            // Antwort als JSON parsen, wenn response.data ein String ist
            const animeData = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;

            // Logge die gesamte API-Antwort zur Fehlerdiagnose
            console.log("API Response:", animeData);

            // Fallback-Leerarray hinzufügen, falls anime_seasons fehlt
            if (!animeData.data || !animeData.data.anime_seasons) {
                console.error('Fehlende anime_seasons in der Antwort:', animeData);
                animeData.data = { ...animeData.data, anime_seasons: [] };
            }

            // Überprüfe, ob anime_seasons im richtigen Pfad vorhanden sind
            if (animeData.data.anime_seasons.length > 0) {
                // Wenn die Struktur wie erwartet ist, verarbeite die Daten
                return animeData.data.anime_seasons.map((season) => ({
                    season_id: season.id.toString(),
                    season_name: season.season === 'Filme' ? season.season : `Staffel ${season.season}`,
                    episodes: (season.anime_episodes || []).map((episode) => ({
                        id: `season-${season.season}-episode-${episode.episode}`,
                        title: `Episode ${episode.episode}`,
                        number: parseInt(episode.episode, 10),
                        season: season.season,
                        image: episode.image
                            ? `https://animecloud.tv/img/thumbs/${episode.image}`
                            : null,
                        imageHash: '',
                        airDate: null,
                    })),
                }));
            } else {
                // Wenn anime_seasons fehlt, logge die Antwort und werfe einen Fehler
                console.error('Fehlende oder leere anime_seasons in der Antwort:', animeData);
                throw new Error("Die erwartete Struktur von anime_seasons fehlt oder ist leer in der Antwort");
            }
        } catch (error) {
            console.error('Error fetching episodes:', error);
            throw error;
        }
    }

    static async fetchCoverImage(animeId) {
        try {
            const url = `https://animecloud.tv/anime/${animeId}`;
            const {data} = await getRequest(url);
            const $ = cheerio.load(data);

            // Get the MovieDB link
            const movieDBLink = $('a[href^="https://www.themoviedb.org"]').first().attr('href');
            if (!movieDBLink) return '';

            const imagesPageUrl = `${movieDBLink}/images/backdrops`;
            const {data: imagesData} = await getRequest(imagesPageUrl);
            const imagesPage = cheerio.load(imagesData);

            // Get the image URL from the images page
            const imageUrl = imagesPage('img.backdrop.w-full').first().attr('src');

            // If imageUrl is not empty, replace part of the URL, otherwise return an empty string
            const finalImageUrl = imageUrl ? imageUrl.replace('w500_and_h282_face', 'original') : '';

            console.log(finalImageUrl); // Log the final URL

            return finalImageUrl; // Return the final URL
        } catch (error) {
            console.error('Error fetching cover image:', error.message);
            return '';
        }
    }

    /**
     * Holt die detaillierten Daten für ein Anime-Objekt (kann auch deine erweiterte Suche umfassen).
     * @param {string} animeId Die ID des Animes
     * @returns {Promise<any>} Das detaillierte Anime-Objekt
     */
    static async fetchAnimeData(animeId) {
        try {
            // Debug: Zeige die animeId und die zusammengebaute URL an
            console.log(`Abrufen von Anime-Daten für Anime-ID: ${animeId}`);

            const animePageUrl = `${baseURL}/anime/stream/${animeId}`;
            console.log(animePageUrl)
            console.log(`Ziel-URL: ${animePageUrl}`); // Debug: Überprüfe die URL

            const animeResponse = await getRequest(animePageUrl);
            const animeHtml = animeResponse.data;
            const $ = cheerio.load(animeHtml);

            const title = $("h1[itemprop='name'] span").text().trim();
            const description = $('p.seri_des').attr('data-full-description');
            //const ratingValue = Number($("span[itemprop='ratingValue']").text()) * 10;
            const image = `${baseURL}${$('div.seriesCoverBox img').attr('data-src')}`;
            //const type = "TV";
            const genres = $("li a[itemprop='genre']").map((_, el) => $(el).text()).get();

            // Alle Staffeln und Episoden zählen
            const seasons = $('.hosterSiteDirectNav ul:first-child li a');
            let totalEpisodes = 0;

            console.log(`Gefundene Staffeln: ${seasons.length}`); // Debug: Ausgabe der gefundenen Staffeln

            for (const seasonElement of seasons) {
                const seasonNumber = $(seasonElement).text().trim();
                const seasonUrl = `${animePageUrl}/staffel-${seasonNumber}`;
                console.log(`Abrufen der Staffel-URL: ${seasonUrl}`); // Debug: Ausgabe der Staffel-URL

                try {
                    const seasonResponse = await getRequest(seasonUrl);
                    const seasonHtml = seasonResponse.data;
                    const episodeLinks = cheerio
                        .load(seasonHtml)("ul:contains('Episoden')")
                        .last()
                        .find('li a');
                    totalEpisodes += episodeLinks.length;
                } catch (seasonError) {
                    console.error(
                        `Fehler beim Abrufen der Staffel-Daten für ${seasonUrl}: ${seasonError.message}`,
                    );
                }
            }

            // Debug: Überprüfe die endgültige ID
            console.log(`Anime-ID aus URL extrahiert: ${animeId}`);

            const coverImage = await this.fetchCoverImage(animeId);

            return {
                id: '154587',
                title: {
                    romaji: title,
                    english: title,
                    native: title,
                },
                trailer: {
                    id: 'qgQunxD0qCk',
                    site: 'youtube',
                    thumbnail: 'https://i.ytimg.com/vi/qgQunxD0qCk/hqdefault.jpg',
                    thumbnailHash: 'hash',
                },
                isLicensed: true,
                isAdult: false,
                countryOfOrigin: 'JP',
                image: image,
                imageHash: 'hash',
                cover: coverImage,
                coverHash: 'hash',
                description: description,
                status: 'Completed',
                releaseDate: 2023,
                totalEpisodes: totalEpisodes,
                currentEpisode: totalEpisodes,
                rating: 91,
                duration: 24,
                genres,
                studios: ['MADHOUSE'],
                season: 'FALL',
                popularity: 243262,
                type: 'TV',
                startDate: {
                    year: 2023,
                    month: 9,
                    day: 29,
                },
                endDate: {
                    year: 2024,
                    month: 3,
                    day: 22,
                },
                recommendations: [
                    {
                        id: 457,
                        malId: 457,
                        title: {
                            romaji: 'Mushishi',
                            english: 'MUSHI-SHI',
                            native: '蟲師',
                            userPreferred: 'Mushishi',
                        },
                        status: 'Completed',
                        episodes: 26,
                        image:
                            'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx457-Si9avlyStAXj.png',
                        imageHash: 'hash',
                        cover:
                            'https://s4.anilist.co/file/anilistcdn/media/anime/banner/n457-sWOJfqYC7s2I.jpg',
                        coverHash:
                            'https://s4.anilist.co/file/anilistcdn/media/anime/banner/n457-sWOJfqYC7s2I.jpg',
                        rating: 85,
                        type: 'TV',
                    },
                    {
                        id: 486,
                        malId: 486,
                        title: {
                            romaji: 'Kino no Tabi: the Beautiful World',
                            english: "Kino's Journey",
                            native: 'キノの旅 -the Beautiful World-',
                            userPreferred: 'Kino no Tabi: the Beautiful World',
                        },
                        status: 'Completed',
                        episodes: 13,
                        image:
                            'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx486-atZiTz3afpOO.jpg',
                        imageHash: 'hash',
                        cover:
                            'https://s4.anilist.co/file/anilistcdn/media/anime/banner/486-cDPgzYdzHNEq.jpg',
                        coverHash:
                            'https://s4.anilist.co/file/anilistcdn/media/anime/banner/486-cDPgzYdzHNEq.jpg',
                        rating: 81,
                        type: 'TV',
                    },
                    {
                        id: 21827,
                        malId: 33352,
                        title: {
                            romaji: 'Violet Evergarden',
                            english: 'Violet Evergarden',
                            native: 'ヴァイオレット・エヴァーガーデン',
                            userPreferred: 'Violet Evergarden',
                        },
                        status: 'Completed',
                        episodes: 13,
                        image:
                            'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/nx21827-10F6m50H4GJK.png',
                        imageHash: 'hash',
                        cover:
                            'https://s4.anilist.co/file/anilistcdn/media/anime/banner/21827-ROucgYiiiSpR.jpg',
                        coverHash:
                            'https://s4.anilist.co/file/anilistcdn/media/anime/banner/21827-ROucgYiiiSpR.jpg',
                        rating: 85,
                        type: 'TV',
                    },
                    {
                        id: 114535,
                        malId: 41025,
                        title: {
                            romaji: 'Fumetsu no Anata e',
                            english: 'To Your Eternity',
                            native: '不滅のあなたへ',
                            userPreferred: 'Fumetsu no Anata e',
                        },
                        status: 'Completed',
                        episodes: 20,
                        image:
                            'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx114535-y3NnjexcqKG1.jpg',
                        imageHash: 'hash',
                        cover:
                            'https://s4.anilist.co/file/anilistcdn/media/anime/banner/114535-ASUprf4AsNwC.jpg',
                        coverHash:
                            'https://s4.anilist.co/file/anilistcdn/media/anime/banner/114535-ASUprf4AsNwC.jpg',
                        rating: 81,
                        type: 'TV',
                    },
                    {
                        id: 477,
                        malId: 477,
                        title: {
                            romaji: 'ARIA The ANIMATION',
                            english: 'ARIA The ANIMATION',
                            native: 'ARIA The ANIMATION',
                            userPreferred: 'ARIA The ANIMATION',
                        },
                        status: 'Completed',
                        episodes: 13,
                        image:
                            'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx477-IhmzyyzROh27.png',
                        imageHash: 'hash',
                        cover:
                            'https://s4.anilist.co/file/anilistcdn/media/anime/banner/477.jpg',
                        coverHash:
                            'https://s4.anilist.co/file/anilistcdn/media/anime/banner/477.jpg',
                        rating: 76,
                        type: 'TV',
                    },
                    {
                        id: 975,
                        malId: 975,
                        title: {
                            romaji: 'Yokohama Kaidashi Kikou',
                            english: 'Yokohama Shopping Log',
                            native: 'ヨコハマ買い出し紀行',
                            userPreferred: 'Yokohama Kaidashi Kikou',
                        },
                        status: 'Completed',
                        episodes: 2,
                        image:
                            'https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/975-EDNYnBJCctSD.jpg',
                        imageHash: 'hash',
                        cover:
                            'https://s4.anilist.co/file/anilistcdn/media/anime/banner/975-6Fcen4DGT5vD.jpg',
                        coverHash:
                            'https://s4.anilist.co/file/anilistcdn/media/anime/banner/975-6Fcen4DGT5vD.jpg',
                        rating: 74,
                        type: 'OVA',
                    },
                    {
                        id: 99420,
                        malId: 35838,
                        title: {
                            romaji: 'Shoujo Shuumatsu Ryokou',
                            english: "Girls' Last Tour",
                            native: '少女終末旅行',
                            userPreferred: 'Shoujo Shuumatsu Ryokou',
                        },
                        status: 'Completed',
                        episodes: 12,
                        image:
                            'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx99420-ROmwm2suzoNJ.png',
                        imageHash: 'hash',
                        cover:
                            'https://s4.anilist.co/file/anilistcdn/media/anime/banner/99420-wwjSxDuLveEu.jpg',
                        coverHash:
                            'https://s4.anilist.co/file/anilistcdn/media/anime/banner/99420-wwjSxDuLveEu.jpg',
                        rating: 81,
                        type: 'TV',
                    },
                    {
                        id: 112609,
                        malId: 40571,
                        title: {
                            romaji: 'Majo no Tabitabi',
                            english: 'Wandering Witch: The Journey of Elaina',
                            native: '魔女の旅々',
                            userPreferred: 'Majo no Tabitabi',
                        },
                        status: 'Completed',
                        episodes: 12,
                        image:
                            'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx112609-dbpOh4fdXAlC.jpg',
                        imageHash: 'hash',
                        cover:
                            'https://s4.anilist.co/file/anilistcdn/media/anime/banner/112609-P969sQ0jIU6S.jpg',
                        coverHash:
                            'https://s4.anilist.co/file/anilistcdn/media/anime/banner/112609-P969sQ0jIU6S.jpg',
                        rating: 74,
                        type: 'TV',
                    },
                    {
                        id: 2966,
                        malId: 2966,
                        title: {
                            romaji: 'Ookami to Koushinryou',
                            english: 'Spice and Wolf',
                            native: '狼と香辛料',
                            userPreferred: 'Ookami to Koushinryou',
                        },
                        status: 'Completed',
                        episodes: 13,
                        image:
                            'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx2966-BDusgFy0UzDy.png',
                        imageHash: 'hash',
                        cover:
                            'https://s4.anilist.co/file/anilistcdn/media/anime/banner/2966-h1ZiL7o7oYPs.jpg',
                        coverHash:
                            'https://s4.anilist.co/file/anilistcdn/media/anime/banner/2966-h1ZiL7o7oYPs.jpg',
                        rating: 80,
                        type: 'TV',
                    },
                    {
                        id: 141914,
                        malId: 55731,
                        title: {
                            romaji: 'Wu Nao Monü',
                            english: 'Agate',
                            native: '无脑魔女',
                            userPreferred: 'Wu Nao Monü',
                        },
                        status: 'Completed',
                        episodes: 15,
                        image:
                            'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx141914-y9QRJEfNb2SS.jpg',
                        imageHash: 'hash',
                        cover:
                            'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx141914-y9QRJEfNb2SS.jpg',
                        coverHash:
                            'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx141914-y9QRJEfNb2SS.jpg',
                        rating: 63,
                        type: 'ONA',
                    },
                    {
                        id: 99457,
                        malId: 35851,
                        title: {
                            romaji: 'Sayonara no Asa ni Yakusoku no Hana wo Kazarou',
                            english: 'Maquia: When the Promised Flower Blooms',
                            native: 'さよならの朝に約束の花をかざろう',
                            userPreferred: 'Sayonara no Asa ni Yakusoku no Hana wo Kazarou',
                        },
                        status: 'Completed',
                        episodes: 1,
                        image:
                            'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx99457-yLAalBQ2Srkh.png',
                        imageHash: 'hash',
                        cover:
                            'https://s4.anilist.co/file/anilistcdn/media/anime/banner/99457-OvX44AF17mEL.jpg',
                        coverHash:
                            'https://s4.anilist.co/file/anilistcdn/media/anime/banner/99457-OvX44AF17mEL.jpg',
                        rating: 82,
                        type: 'MOVIE',
                    },
                    {
                        id: 4081,
                        malId: 4081,
                        title: {
                            romaji: 'Natsume Yuujinchou',
                            english: "Natsume's Book of Friends Season 1",
                            native: '夏目友人帳',
                            userPreferred: 'Natsume Yuujinchou',
                        },
                        status: 'Completed',
                        episodes: 13,
                        image:
                            'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx4081-33BLrdaPdZjP.jpg',
                        imageHash: 'hash',
                        cover:
                            'https://s4.anilist.co/file/anilistcdn/media/anime/banner/4081-dbeE4uMExtgc.jpg',
                        coverHash:
                            'https://s4.anilist.co/file/anilistcdn/media/anime/banner/4081-dbeE4uMExtgc.jpg',
                        rating: 80,
                        type: 'TV',
                    },
                    {
                        id: 387,
                        malId: 387,
                        title: {
                            romaji: 'Haibane Renmei',
                            english: 'Haibane Renmei',
                            native: '灰羽連盟',
                            userPreferred: 'Haibane Renmei',
                        },
                        status: 'Completed',
                        episodes: 13,
                        image:
                            'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx387-eewftYhOOFVP.png',
                        imageHash: 'hash',
                        cover:
                            'https://s4.anilist.co/file/anilistcdn/media/anime/banner/387-2ogrNTbIYy2T.jpg',
                        coverHash:
                            'https://s4.anilist.co/file/anilistcdn/media/anime/banner/387-2ogrNTbIYy2T.jpg',
                        rating: 79,
                        type: 'TV',
                    },
                    {
                        id: 98436,
                        malId: 35062,
                        title: {
                            romaji: 'Mahoutsukai no Yome',
                            english: "The Ancient Magus' Bride",
                            native: '魔法使いの嫁',
                            userPreferred: 'Mahoutsukai no Yome',
                        },
                        status: 'Completed',
                        episodes: 24,
                        image:
                            'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx98436-n7sK6POCd0XV.png',
                        imageHash: 'hash',
                        cover:
                            'https://s4.anilist.co/file/anilistcdn/media/anime/banner/98436-mipAtJXRUCgx.jpg',
                        coverHash:
                            'https://s4.anilist.co/file/anilistcdn/media/anime/banner/98436-mipAtJXRUCgx.jpg',
                        rating: 78,
                        type: 'TV',
                    },
                    {
                        id: 146065,
                        malId: 51179,
                        title: {
                            romaji: 'Mushoku Tensei II: Isekai Ittara Honki Dasu',
                            english: 'Mushoku Tensei: Jobless Reincarnation Season 2',
                            native: '無職転生Ⅱ ～異世界行ったら本気だす～',
                            userPreferred: 'Mushoku Tensei II: Isekai Ittara Honki Dasu',
                        },
                        status: 'Completed',
                        episodes: 13,
                        image:
                            'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx146065-IjirxRK26O03.png',
                        imageHash: 'hash',
                        cover:
                            'https://s4.anilist.co/file/anilistcdn/media/anime/banner/146065-33RDijfuxLLk.jpg',
                        coverHash:
                            'https://s4.anilist.co/file/anilistcdn/media/anime/banner/146065-33RDijfuxLLk.jpg',
                        rating: 82,
                        type: 'TV',
                    },
                    {
                        id: 108465,
                        malId: 39535,
                        title: {
                            romaji: 'Mushoku Tensei: Isekai Ittara Honki Dasu',
                            english: 'Mushoku Tensei: Jobless Reincarnation',
                            native: '無職転生 ～異世界行ったら本気だす～',
                            userPreferred: 'Mushoku Tensei: Isekai Ittara Honki Dasu',
                        },
                        status: 'Completed',
                        episodes: 11,
                        image:
                            'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx108465-B9S9zC68eS5j.jpg',
                        imageHash: 'hash',
                        cover:
                            'https://s4.anilist.co/file/anilistcdn/media/anime/banner/108465-RgsRpTMhP9Sv.jpg',
                        coverHash:
                            'https://s4.anilist.co/file/anilistcdn/media/anime/banner/108465-RgsRpTMhP9Sv.jpg',
                        rating: 82,
                        type: 'TV',
                    },
                    {
                        id: 127720,
                        malId: 45576,
                        title: {
                            romaji: 'Mushoku Tensei: Isekai Ittara Honki Dasu Part 2',
                            english: 'Mushoku Tensei: Jobless Reincarnation Cour 2',
                            native: '無職転生 ～異世界行ったら本気だす～ 第2クール',
                            userPreferred: 'Mushoku Tensei: Isekai Ittara Honki Dasu Part 2',
                        },
                        status: 'Completed',
                        episodes: 12,
                        image:
                            'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx127720-ADJgIrUVMdU9.jpg',
                        imageHash: 'hash',
                        cover:
                            'https://s4.anilist.co/file/anilistcdn/media/anime/banner/127720-oBpHiMWQhFVN.jpg',
                        coverHash:
                            'https://s4.anilist.co/file/anilistcdn/media/anime/banner/127720-oBpHiMWQhFVN.jpg',
                        rating: 85,
                        type: 'TV',
                    },
                    {
                        id: 128546,
                        malId: 46095,
                        title: {
                            romaji: 'Vivy: Fluorite Eye’s Song',
                            english: "Vivy -Fluorite Eye's Song-",
                            native: 'Vivy -Fluorite Eye’s Song-',
                            userPreferred: 'Vivy: Fluorite Eye’s Song',
                        },
                        status: 'Completed',
                        episodes: 13,
                        image:
                            'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx128546-UIwyhuhjxmL0.jpg',
                        imageHash: 'hash',
                        cover:
                            'https://s4.anilist.co/file/anilistcdn/media/anime/banner/128546-V5KVgbzQwFYm.jpg',
                        coverHash:
                            'https://s4.anilist.co/file/anilistcdn/media/anime/banner/128546-V5KVgbzQwFYm.jpg',
                        rating: 82,
                        type: 'TV',
                    },
                    {
                        id: 98444,
                        malId: 34798,
                        title: {
                            romaji: 'Yuru Camp△',
                            english: 'Laid-Back Camp',
                            native: 'ゆるキャン△',
                            userPreferred: 'Yuru Camp△',
                        },
                        status: 'Completed',
                        episodes: 12,
                        image:
                            'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx98444-tgu5kWwnBigW.jpg',
                        imageHash: 'hash',
                        cover:
                            'https://s4.anilist.co/file/anilistcdn/media/anime/banner/98444-FpH9lzLiafe9.jpg',
                        coverHash:
                            'https://s4.anilist.co/file/anilistcdn/media/anime/banner/98444-FpH9lzLiafe9.jpg',
                        rating: 81,
                        type: 'TV',
                    },
                    {
                        id: 97986,
                        malId: 34599,
                        title: {
                            romaji: 'Made in Abyss',
                            english: 'Made in Abyss',
                            native: 'メイドインアビス',
                            userPreferred: 'Made in Abyss',
                        },
                        status: 'Completed',
                        episodes: 13,
                        image:
                            'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx97986-tXLonOO0vhHb.jpg',
                        imageHash: 'hash',
                        cover:
                            'https://s4.anilist.co/file/anilistcdn/media/anime/banner/97986-C55UnbJKB7ZF.jpg',
                        coverHash:
                            'https://s4.anilist.co/file/anilistcdn/media/anime/banner/97986-C55UnbJKB7ZF.jpg',
                        rating: 85,
                        type: 'TV',
                    },
                    {
                        id: 108617,
                        malId: 39575,
                        title: {
                            romaji: 'Somali to Mori no Kamisama',
                            english: 'Somali and the Forest Spirit',
                            native: 'ソマリと森の神様',
                            userPreferred: 'Somali to Mori no Kamisama',
                        },
                        status: 'Completed',
                        episodes: 12,
                        image:
                            'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx108617-PgoYLgWzzm0c.png',
                        imageHash: 'hash',
                        cover:
                            'https://s4.anilist.co/file/anilistcdn/media/anime/banner/108617-K5pexm0OYdJl.jpg',
                        coverHash:
                            'https://s4.anilist.co/file/anilistcdn/media/anime/banner/108617-K5pexm0OYdJl.jpg',
                        rating: 76,
                        type: 'TV',
                    },
                    {
                        id: 138565,
                        malId: 49709,
                        title: {
                            romaji: 'Fumetsu no Anata e Season 2',
                            english: 'To Your Eternity Season 2',
                            native: '不滅のあなたへ Season 2',
                            userPreferred: 'Fumetsu no Anata e Season 2',
                        },
                        status: 'Completed',
                        episodes: 20,
                        image:
                            'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx138565-JzvDqH84ILzi.png',
                        imageHash: 'hash',
                        cover:
                            'https://s4.anilist.co/file/anilistcdn/media/anime/banner/138565-Gzw9xYWtgF6U.jpg',
                        coverHash:
                            'https://s4.anilist.co/file/anilistcdn/media/anime/banner/138565-Gzw9xYWtgF6U.jpg',
                        rating: 79,
                        type: 'TV',
                    },
                    {
                        id: 130166,
                        malId: 48239,
                        title: {
                            romaji: 'Leadale no Daichi nite',
                            english: 'In the Land of Leadale',
                            native: 'リアデイルの大地にて',
                            userPreferred: 'Leadale no Daichi nite',
                        },
                        status: 'Completed',
                        episodes: 12,
                        image:
                            'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx130166-YVHrYg4wNA68.jpg',
                        imageHash: 'hash',
                        cover:
                            'https://s4.anilist.co/file/anilistcdn/media/anime/banner/130166-VfxhkKvXFppG.jpg',
                        coverHash:
                            'https://s4.anilist.co/file/anilistcdn/media/anime/banner/130166-VfxhkKvXFppG.jpg',
                        rating: 68,
                        type: 'TV',
                    },
                    {
                        id: 136430,
                        malId: 49387,
                        title: {
                            romaji: 'VINLAND SAGA SEASON 2',
                            english: 'Vinland Saga Season 2',
                            native: 'ヴィンランド・サガ SEASON2',
                            userPreferred: 'VINLAND SAGA SEASON 2',
                        },
                        status: 'Completed',
                        episodes: 24,
                        image:
                            'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx136430-YrQ8nBDW7gT0.jpg',
                        imageHash: 'hash',
                        cover:
                            'https://s4.anilist.co/file/anilistcdn/media/anime/banner/136430-ktoFZnyubhHg.jpg',
                        coverHash:
                            'https://s4.anilist.co/file/anilistcdn/media/anime/banner/136430-ktoFZnyubhHg.jpg',
                        rating: 88,
                        type: 'TV',
                    },
                    {
                        id: 130550,
                        malId: 48405,
                        title: {
                            romaji: 'Totsukuni no Shoujo (2022)',
                            english: 'The Girl from the Other Side',
                            native: 'とつくにの少女 (2022)',
                            userPreferred: 'Totsukuni no Shoujo (2022)',
                        },
                        status: 'Completed',
                        episodes: 1,
                        image:
                            'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx130550-TNuuHlL1BIMZ.jpg',
                        imageHash: 'hash',
                        cover:
                            'https://s4.anilist.co/file/anilistcdn/media/anime/banner/130550-tdYGcblNd8oU.jpg',
                        coverHash:
                            'https://s4.anilist.co/file/anilistcdn/media/anime/banner/130550-tdYGcblNd8oU.jpg',
                        rating: 76,
                        type: 'OVA',
                    },
                ],
                color: '#aee493',
                relations: [
                    {
                        id: 118586,
                        malId: 126287,
                        relationType: 'ADAPTATION',
                        title: {
                            romaji: 'Sousou no Frieren',
                            english: 'Frieren: Beyond Journey’s End',
                            native: '葬送のフリーレン',
                            userPreferred: 'Sousou no Frieren',
                        },
                        status: 'Ongoing',
                        episodes: null,
                        image:
                            'https://s4.anilist.co/file/anilistcdn/media/manga/cover/large/bx118586-F0Lp86XQV7du.jpg',
                        imageHash: 'hash',
                        cover:
                            'https://s4.anilist.co/file/anilistcdn/media/manga/banner/118586-R1c7mc72oPvS.jpg',
                        coverHash: 'hash',
                        rating: 87,
                        type: 'MANGA',
                    },
                    {
                        id: 169811,
                        malId: 56805,
                        relationType: 'CHARACTER',
                        title: {
                            romaji: 'Yuusha',
                            english: 'The Brave',
                            native: '勇者',
                            userPreferred: 'Yuusha',
                        },
                        status: 'Completed',
                        episodes: 1,
                        image:
                            'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx169811-tsuH0SJVJy40.jpg',
                        imageHash: 'hash',
                        cover:
                            'https://s4.anilist.co/file/anilistcdn/media/anime/banner/169811-jgMVZlIdH19a.jpg',
                        coverHash: 'hash',
                        rating: 81,
                        type: 'MUSIC',
                    },
                    {
                        id: 170068,
                        malId: 56885,
                        relationType: 'SIDE_STORY',
                        title: {
                            romaji: 'Sousou no Frieren: ●● no Mahou',
                            english: null,
                            native: '葬送のフリーレン　～●●の魔法～',
                            userPreferred: 'Sousou no Frieren: ●● no Mahou',
                        },
                        status: 'Completed',
                        episodes: 12,
                        image:
                            'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx170068-ijY3tCP8KoWP.jpg',
                        imageHash: 'hash',
                        cover:
                            'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx170068-ijY3tCP8KoWP.jpg',
                        coverHash: 'hash',
                        rating: 74,
                        type: 'ONA',
                    },
                    {
                        id: 175691,
                        malId: 58313,
                        relationType: 'OTHER',
                        title: {
                            romaji: 'Haru',
                            english: 'Sunny',
                            native: '晴る',
                            userPreferred: 'Haru',
                        },
                        status: 'Completed',
                        episodes: 1,
                        image:
                            'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx175691-lTfPc3P63Uyx.png',
                        imageHash: 'hash',
                        cover:
                            'https://s4.anilist.co/file/anilistcdn/media/anime/banner/175691-iu677BWqMrP2.jpg',
                        coverHash: 'hash',
                        rating: 72,
                        type: 'MUSIC',
                    },
                    {
                        id: 182255,
                        malId: 59978,
                        relationType: 'SEQUEL',
                        title: {
                            romaji: 'Sousou no Frieren 2nd Season',
                            english: null,
                            native: '葬送のフリーレン 第２期',
                            userPreferred: 'Sousou no Frieren 2nd Season',
                        },
                        status: 'Not yet aired',
                        episodes: null,
                        image:
                            'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx182255-kkNe9kpGyaGx.jpg',
                        imageHash: 'hash',
                        cover:
                            'https://s4.anilist.co/file/anilistcdn/media/anime/banner/182255-eGmzBcmadFsK.jpg',
                        coverHash: 'hash',
                        rating: null,
                        type: 'TV',
                    },
                ],
                seasons: [
                    {
                        id: 'season-1',
                        name: 'Spring 2024',
                        episodes: [
                            {
                                id: 'episode-1',
                                title: 'Episode 1: The Beginning',
                                description: 'The adventure starts.',
                                number: 1,
                                image: 'http://example.com/episode1.jpg',
                                imageHash: 'abcdef1234567890',
                                airDate: '2024-04-01',
                            },
                            {
                                id: 'episode-2',
                                title: 'Episode 2: The Conflict',
                                description: 'The protagonist faces new challenges.',
                                number: 2,
                                image: 'http://example.com/episode2.jpg',
                                imageHash: 'abcdef1234567891',
                                airDate: '2024-04-08',
                            },
                        ],
                    },
                ],
            };
        } catch (error) {
            console.error(
                `Fehler beim Abrufen der Daten für ${animeId}: ${error.message}`,
            );
            return null;
        }
    }
}