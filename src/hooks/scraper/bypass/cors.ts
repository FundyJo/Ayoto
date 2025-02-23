import { fetch } from '@tauri-apps/plugin-http';

export interface HttpResponse<T> {
    data: T;
    status: number;
    statusText: string;
}

const DEFAULT_TIMEOUT = 30000;

/**
 * Executes an HTTP request and parses the response using the provided function.
 *
 * @param url - The URL to request.
 * @param options - Request options (method, headers, timeout, etc.).
 * @param parseResponse - A function to parse the response (e.g., text(), json(), etc.).
 * @returns A Promise that returns an HttpResponse object with the parsed data.
 */
async function request<T>(
    url: string,
    options: RequestInit,
    parseResponse: (response: Response) => Promise<T>
): Promise<HttpResponse<T>> {
    try {
        const response = await fetch(url, options);
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const data = await parseResponse(response);
        return {
            data,
            status: response.status,
            statusText: response.statusText || 'OK',
        };
    } catch (error: any) {
        return {
            data: {} as T,
            status: error.response ? error.response.status : 500,
            statusText: error.message,
        };
    }
}

/**
 * Executes a GET request and returns the response as text.
 *
 * @param url - The URL to request.
 * @param headers - Optional custom headers.
 * @param options - Additional optional request options.
 * @returns A Promise that returns an HttpResponse object with a string data field.
 */
export async function getRequest(
    url: string,
    headers: Record<string, string> = {},
    options: RequestInit = {}
): Promise<HttpResponse<string>> {
    console.log("Requesting URL:", url);
    const fetchOptions: RequestInit = {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            ...headers,
        },
        signal: AbortSignal.timeout(DEFAULT_TIMEOUT),
        ...options,
    };
    return request<string>(url, fetchOptions, async (res) => res.text());
}

/**
 * Executes a GET request with an additional redirect option and returns the response as text.
 *
 * @param url - The URL to request.
 * @param headers - Optional custom headers.
 * @param options - Additional optional request options.
 * @returns A Promise that returns an HttpResponse object with a string data field.
 */
export async function getTest(
    url: string,
    headers: Record<string, string> = {},
    options: RequestInit = {}
): Promise<HttpResponse<string>> {
    console.log("Requesting URL (Test):", url);
    const fetchOptions: RequestInit = {
        method: 'GET',
        redirect: 'follow', // Specific option for this request
        headers: {
            'Content-Type': 'application/json',
            ...headers,
        },
        signal: AbortSignal.timeout(DEFAULT_TIMEOUT),
        ...options,
    };
    return request<string>(url, fetchOptions, async (res) => res.text());
}

/**
 * Executes a POST request and returns the response as JSON.
 *
 * @param url - The URL to which the data is posted.
 * @param headers - Optional custom headers.
 * @param body - The request body, which is sent as JSON.
 * @returns A Promise that returns an HttpResponse object with a JSON data field.
 */
export async function postRequest(
    url: string,
    headers: Record<string, string> = {},
    body: any = {}
): Promise<HttpResponse<any>> {
    console.log("Posting URL:", url);
    const fetchOptions: RequestInit = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...headers,
        },
        signal: AbortSignal.timeout(DEFAULT_TIMEOUT),
        body: JSON.stringify(body),
    };
    return request<any>(url, fetchOptions, async (res) => res.json());
}
