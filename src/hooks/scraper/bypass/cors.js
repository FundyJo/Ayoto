import {fetch} from '@tauri-apps/plugin-http';

// GET Methode
export function getTest(url, headers = {}, options = {}) {
    console.log("Requesting URL:", url);

    const fetchOptions = {
        method: 'GET',
        redirect: "follow",
        headers: {
            'Content-Type': 'application/json', // Standard-Header
            ...headers, // Benutzerdefinierte Header
        },
        signal: AbortSignal.timeout(30000),
        ...options, // Zusätzliche Optionen überschreiben die Standardoptionen
    };

    // Proxy-Konfiguration einfügen in ClientOptions
    const clientOptions = {
        ...fetchOptions,
    };

    return fetch(url, clientOptions)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.text(); // HTML- oder Text-Antwort zurückgeben
        })
        .then(html => ({
            data: html,
            status: 200,
            statusText: 'OK',
        }))
        .catch(error => ({
            data: '',
            status: error.response ? error.response.status : 500,
            statusText: error.message,
        }));
}

export function getRequest(url, headers = {}, options = {}) {
    console.log("Requesting URL:", url);

    const fetchOptions = {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json', // Standard-Header
            ...headers, // Benutzerdefinierte Header
        },
        signal: AbortSignal.timeout(30000),
        ...options, // Zusätzliche Optionen überschreiben die Standardoptionen
    };

    // Proxy-Konfiguration einfügen in ClientOptions
    const clientOptions = {
        ...fetchOptions,
    };

    return fetch(url, clientOptions)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.text(); // HTML- oder Text-Antwort zurückgeben
        })
        .then(html => ({
            data: html,
            status: 200,
            statusText: 'OK',
        }))
        .catch(error => ({
            data: '',
            status: error.response ? error.response.status : 500,
            statusText: error.message,
        }));
}

// POST Methode
export function postRequest(url, headers = {}, body = {}) {
    console.log("Posting URL:", url);

    return fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...headers,  // Benutzerdefinierte Header
        },
        signal: AbortSignal.timeout(30000),
        body: JSON.stringify(body),
    })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();  // Antwort als JSON zurückgeben
        })
        .then(data => ({
            data,
            status: 200,
            statusText: 'OK',
        }))
        .catch(error => ({
            data: [],
            status: error.response ? error.response.status : 500,
            statusText: error.message,
        }));
}
