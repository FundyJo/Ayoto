import * as cheerio from 'cheerio';
import { getTest } from "../scraper/bypass/cors.ts";

const headers: Record<string, string> = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0"
};

class Vidoza {
  static async getDirectLink(url: string): Promise<string | null> {
    try {
      // Optionen mit zusätzlichen Eigenschaften werden per Type Assertion in RequestInit umgewandelt.
      const options = {
        maxRedirects: 0,
        validateStatus: (status: number) => status >= 300 && status < 400,
      } as unknown as RequestInit;

      // Beachte: Der zweite Parameter sind die Header, der dritte die Optionen.
      const { data } = await getTest(url, headers, options);
      const $ = cheerio.load(data);

      // Versuche, das src-Attribut des <video>-Tags zu extrahieren
      const videoSrc = $('video').attr('src');
      if (videoSrc) {
        return videoSrc;
      }

      // Falls nicht vorhanden, versuche das src-Attribut des ersten <source>-Tags
      const videoSource = $('source').first().attr('src');
      if (videoSource) {
        return videoSource;
      }

      return null;
    } catch (error: any) {
      console.error('Fehler beim Abrufen des Links:', error.message);
      return null;
    }
  }
}

export default Vidoza;
