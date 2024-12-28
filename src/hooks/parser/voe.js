import axios from 'axios';
import base64 from 'base-64';
import {getRequest, getTest} from "../scraper/bypass/cors.js";

const headers = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0"
};


class VOE {
  static REDIRECT_PATTERN = /window\.location\.href\s*=\s*'(https:\/\/[^/]+\/e\/\w+)';/;
  static EXTRACT_VEO_HLS_PATTERN = /'hls': '(.*)'/;

  static async getDirectLink(url) {
    try {
      const response = await getTest(url, {
        headers,
        maxRedirects: 0,
        validateStatus: (status) => status >= 300 && status < 400, // Nur Weiterleitungsstatus akzeptieren
      });

      const redirectMatch = response.data.match(VOE.REDIRECT_PATTERN);
      if (!redirectMatch) {
        console.warn("No redirect link found.");
        return null;
      }


      const redirectUrl = redirectMatch[1];
      const redirectResponse = await getRequest(redirectUrl, {
        headers: { headers },
      });

      const redirectContentStr = redirectResponse.data;

      // Suche nach dem HLS-Link im Inhalt
      const hlsMatch = redirectContentStr.match(VOE.EXTRACT_VEO_HLS_PATTERN);
      if (!hlsMatch) {
        console.warn("No HLS link found.");
        return null;
      }

      // Entschlüssle den HLS-Link aus Base64
      return base64.decode(hlsMatch.groups?.hls || hlsMatch[1]);
    } catch (error) {
      return null;
    }
  }
}

export default VOE;