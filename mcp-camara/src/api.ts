import fetch from 'node-fetch';

const BASE_URL = 'https://dadosabertos.camara.leg.br/api/v2';
const TIMEOUT_MS = 30000;

export async function fetchCamaraAPI(
  endpoint: string,
  queryParams?: Record<string, any>
): Promise<any> {
  try {
    const url = new URL(`${BASE_URL}${endpoint}`);

    if (queryParams) {
      Object.entries(queryParams).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            url.searchParams.append(key, value.join(','));
          } else {
            url.searchParams.append(key, String(value));
          }
        }
      });
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'User-Agent': 'MCP-Camara-Bot/1.0',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw new Error('Request timeout após 30 segundos');
    }
    if (error.message?.includes('HTTP')) {
      throw error;
    }
    throw new Error(`Erro de rede: ${error.message}`);
  }
}
