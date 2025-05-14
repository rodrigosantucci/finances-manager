import { HttpHandlerFn, HttpRequest } from '@angular/common/http';
import { InjectionToken, inject } from '@angular/core';

// Novos Tokens para as URLs base das APIs
export const BASE_URL = new InjectionToken<string>('BASE_URL');
export const AUTH_URL = new InjectionToken<string>('AUTH_URL');
// Não precisamos de um token para localUrl neste interceptor, pois ele não prefixará requisições locais.

export function hasHttpScheme(url: string): boolean {
  return new RegExp('^http(s)?://', 'i').test(url);
}

// Função auxiliar para combinar a URL base com o caminho da requisição de forma segura
function joinUrlSegments(base: string, path: string): string {
  // Remove barras finais da base e barras iniciais do caminho, depois junta
  return `${base.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
}


export function baseUrlInterceptor(req: HttpRequest<unknown>, next: HttpHandlerFn) {
  // Injete as URLs base das APIs
  const mainApiUrl = inject(BASE_URL, { optional: true });
  const authApiUrl = inject(AUTH_URL, { optional: true });

  const originalUrl = req.url;

  // Verifica se a URL da requisição é relativa (não começa com http/https)
  if (!hasHttpScheme(originalUrl)) {
    let baseUrlToUse: string | undefined;
    let pathWithoutPrefix: string = originalUrl; // Inicializa com a URL original

    // --- Lógica para escolher a URL base com base no prefixo ---

    // 1. Verifica se a URL começa com o prefixo da API de Autenticação (mais específico)
    const authPrefix = '/api/auth/'; // <-- Defina o prefixo para requisições de Auth
    if (originalUrl.startsWith(authPrefix) && authApiUrl) {
      baseUrlToUse = authApiUrl;
      console.log(`[BaseUrlInterceptor] Req. Auth (${originalUrl}). Usando AUTH_API_URL.`);
    }
    // 2. Verifica se a URL começa com o prefixo da API Principal (menos específico)
    // Esta condição só será avaliada se não corresponder ao prefixo de Auth.
    const mainPrefix = '/api/'; // <-- Defina o prefixo para requisições da API principal
     if (originalUrl.startsWith(mainPrefix) && mainApiUrl && !baseUrlToUse) { // Garante que não foi definido pela Auth
       baseUrlToUse = mainApiUrl;
       console.log(`[BaseUrlInterceptor] Req. Principal (${originalUrl}). Usando MAIN_API_URL.`);
    }
    // Adicione outras lógicas 'else if' aqui para outros prefixos de API se necessário

    // --- Aplica a URL base escolhida ---
    if (baseUrlToUse) {
       const fullUrl = joinUrlSegments(baseUrlToUse as string, pathWithoutPrefix);
       console.log(`[BaseUrlInterceptor] Reescrevendo URL: ${originalUrl} -> ${fullUrl}`);
       return next(req.clone({ url: fullUrl }));
    } else {
       // Se a URL é relativa, mas não corresponde a nenhum prefixo de API (ex: 'i18n/en.json', 'assets/image.png')
       // Deixe-a passar inalterada. Ela será resolvida em relação à URL onde a aplicação Angular está sendo servida (localhost:4200).
       console.log(`[BaseUrlInterceptor] URL Relativa sem prefixo de API (${originalUrl}). Passando adiante.`);
       return next(req);
    }

  }

  // Se a URL já é absoluta (começa com http:// ou https://), passe adiante sem modificação.
  console.log(`[BaseUrlInterceptor] URL Absoluta (${originalUrl}). Passando adiante.`);
  return next(req);
}
