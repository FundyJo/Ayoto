import { getRequest, getTest } from "../scraper/bypass/cors.ts";
import { fetch } from '@tauri-apps/plugin-http';

const DEFAULT_TIMEOUT = 30000;

const HEADERS: Record<string, string> = {
  'User-Agent': 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36 Edg/131.0.0.0',
  'Referer': 'https://dood.li/',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9,de;q=0.8',
  'Connection': 'keep-alive',
};

class Doodstream {
  /**
   * Extrahiert anhand eines regulären Ausdrucks einen bestimmten Teilstring.
   */
  static extractData(pattern: RegExp, content: string): string | null {
    const match = content.match(pattern);
    return match ? match[1] : null;
  }

  /**
   * Erzeugt einen zufälligen String der angegebenen Länge.
   */
  static generateRandomString(length: number = 10): string {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    const charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
  }

  /**
   * Lädt eine URL als Binärdaten herunter, erzeugt daraus einen Blob und gibt eine Objekt-URL zurück.
   */
  async blobFetch(url: string): Promise<string> {
    const fetchOptions: RequestInit = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...HEADERS,
      },
      signal: AbortSignal.timeout(DEFAULT_TIMEOUT),
    };

    const response = await fetch(url, fetchOptions);
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    // Verwende arrayBuffer(), um die Binärdaten zu laden
    const arrayBuffer = await response.arrayBuffer();
    const blob = new Blob([arrayBuffer]);
    return URL.createObjectURL(blob);
  }

  /**
   * Generiert die finale Video-URL, indem aus dem HTML-Content die pass_md5-URL und ein Token extrahiert werden.
   */
  static async getDirectLink(url: string): Promise<string | undefined> {
    try {
      // Optionen mit zusätzlichen Eigenschaften typisieren
      const options = {
        redirect: 'follow',
        maxRedirects: 0,
        validateStatus: (status: number) => status >= 300 && status < 400,
      } as unknown as RequestInit;

      const response = await getTest(url, HEADERS, options);
      const content = response.data;

      // Extrahiere die pass_md5-URL
      const passMd5Pattern = /\$\.get\('([^']*\/pass_md5\/[^']*)'/;
      const passMd5Url = Doodstream.extractData(passMd5Pattern, content);
      if (!passMd5Url) {
        throw new Error('pass_md5 URL konnte nicht gefunden werden.');
      }
      const fullMd5Url = `https://dood.li${passMd5Url}`;

      // Extrahiere das Token
      const tokenPattern = /token=([a-zA-Z0-9]+)/;
      const token = Doodstream.extractData(tokenPattern, content);
      if (!token) {
        throw new Error('Token konnte nicht gefunden werden.');
      }

      // Abrufen der Basis-Video-URL
      const md5Response = await getRequest(fullMd5Url, HEADERS);
      const videoBaseUrl = md5Response.data.trim();

      // Generiere finale URL
      const randomString = Doodstream.generateRandomString();
      const expiry = Math.floor(Date.now() / 1000);
      return `${videoBaseUrl}${randomString}?token=${token}&expiry=${expiry}`;
    } catch (error: any) {
      console.error('Fehler:', error.message);
      return undefined;
    }
  }
}

export default Doodstream;
