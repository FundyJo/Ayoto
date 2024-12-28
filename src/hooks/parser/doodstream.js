import axios from 'axios';
import {getRequest, getTest} from "../scraper/bypass/cors.js";

const headers = {
  'User-Agent': 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36 Edg/131.0.0.0',
  'Referer': 'https://dood.li/',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9,de;q=0.8',
  'Connection': 'keep-alive',
};

class Doodstream {

  static extractData(pattern, content) {
    const match = content.match(pattern);
    return match ? match[1] : null;
  }

  static generateRandomString(length = 10) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
  }

  async blobFetch(url) {
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36 Edg/131.0.0.0',
      'Referer': 'https://dood.li/',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9,de;q=0.8',
      'Connection': 'keep-alive',
    };

    const response = await getTest(url, { headers });
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const blob = await response.blob();
    return URL.createObjectURL(blob);
  }


  // WICHTIG ( Generiert url wird ohne Header verweigert Error => 403 )
  static async getDirectLink(url) {
    try {
      const response = await getTest(url, {
        headers,
        maxRedirects: 0,
        validateStatus: (status) => status >= 300 && status < 400, // Nur Weiterleitungsstatus akzeptieren
      });
      const content = response.data;

      // 2. Extrahieren der pass_md5-URL
      const passMd5Pattern = /\$\.get\('([^']*\/pass_md5\/[^']*)'/;
      const passMd5Url = Doodstream.extractData(passMd5Pattern, content);

      if (!passMd5Url) {
        throw new Error('pass_md5 URL konnte nicht gefunden werden.');
      }

      const fullMd5Url = `https://dood.li${passMd5Url}`;

      // 3. Extrahieren des Tokens aus dem JavaScript-Code
      const tokenPattern = /token=([a-zA-Z0-9]+)/;
      const token = Doodstream.extractData(tokenPattern, content);

      if (!token) {
        throw new Error('Token konnte nicht gefunden werden.');
      }

      // 4. Abrufen der Basis-Video-URL mit den Headers
      const md5Response = await getRequest(fullMd5Url, { headers });
      const videoBaseUrl = md5Response.data.trim();

      // 5. Finale URL generieren
      const randomString = Doodstream.generateRandomString(10);
      const expiry = Math.floor(Date.now() / 1000); // Ablaufzeit in Sekunden

      // Kombiniere die generierte zufällige Zeichenkette mit Token und Expiry
      return `${videoBaseUrl}${randomString}?token=${token}&expiry=${expiry}`;
    } catch (error) {
      console.error('Fehler:', error.message);
    }
  }
}
export default Doodstream;

