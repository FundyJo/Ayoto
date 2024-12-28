import * as cheerio from 'cheerio';
import {getTest} from "../scraper/bypass/cors.js";

const headers = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0"
};


class Vidoza {

  static async getDirectLink(url) {
    try {
      const { data } = await getTest(url, {
        headers,
        maxRedirects: 0,
        validateStatus: (status) => status >= 300 && status < 400, // Nur Weiterleitungsstatus akzeptieren
      });

      const $ = cheerio.load(data);

      const videoSrc = $('video').attr('src');

      if (videoSrc) {
        return videoSrc;
      }

      const videoSource = $('source').first().attr('src');

      if (videoSource) {
        return videoSource;
      }

      return null;

    } catch (error) {
      console.error('Fehler beim Abrufen des Links:', error.message);
      return null;
    }
  }
}

export default Vidoza;
