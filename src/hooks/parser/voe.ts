import base64 from 'base-64';
import { getRequest, getTest, HttpResponse } from "../scraper/bypass/cors.ts";

const headers: Record<string, string> = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0"
};

class VOE {
  static REDIRECT_PATTERN: RegExp = /window\.location\.href\s*=\s*'(https:\/\/[^/]+\/e\/\w+)';/;
  static EXTRACT_VEO_HLS_PATTERN: RegExp = /'hls': '(?<hls>.*)'/;

  static async getDirectLink(url: string): Promise<string | null> {
    try {
      // Optionen mit zusätzlichen Eigenschaften typisieren
      const options = {
        maxRedirects: 0,
        validateStatus: (status: number) => status >= 300 && status < 400,
      } as unknown as RequestInit;

      // Abrufen des HTML-Contents mit getTest (Header und Optionen getrennt übergeben)
      const response: HttpResponse<string> = await getTest(url, headers, options);
      const redirectMatch = response.data.match(VOE.REDIRECT_PATTERN);
      if (!redirectMatch) {
        console.warn("No redirect link found.");
        return null;
      }

      const redirectUrl = redirectMatch[1];
      const redirectResponse: HttpResponse<string> = await getRequest(redirectUrl, headers);
      const redirectContentStr = redirectResponse.data;

      // Suche nach dem HLS-Link im Inhalt
      const hlsMatch = redirectContentStr.match(VOE.EXTRACT_VEO_HLS_PATTERN);
      if (!hlsMatch) {
        console.warn("No HLS link found.");
        return null;
      }

      // Entschlüssle den HLS-Link aus Base64
      const hlsLink: string = hlsMatch.groups?.hls || hlsMatch[1];
      return base64.decode(hlsLink);
    } catch (error: any) {
      console.error('Fehler beim Abrufen des Links:', error.message);
      return null;
    }
  }
}

export default VOE;
