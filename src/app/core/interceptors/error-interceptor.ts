import { HttpErrorResponse, HttpHandlerFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { catchError, throwError } from 'rxjs';

export enum STATUS {
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  INTERNAL_SERVER_ERROR = 500,
}

export function errorInterceptor(req: HttpRequest<unknown>, next: HttpHandlerFn) {
  const router = inject(Router);
  const toast = inject(ToastrService);
  const errorPages = [STATUS.FORBIDDEN, STATUS.NOT_FOUND, STATUS.INTERNAL_SERVER_ERROR];

  // Helper para verificar se a requisição é para a rota de login
  // **AJUSTE este caminho '/api/auth/login' para o ENDPOINT REAL da sua API de login**
  const isLoginRequest = (request: HttpRequest<unknown>): boolean => {
    const loginApiEndpoint = '/api/auth/login'; // <-- **VERIFIQUE E AJUSTE ESTE CAMINHO**
    return request.url.includes(loginApiEndpoint);
  };


  const isAvatarRequest = (request: HttpRequest<unknown>): boolean => {
    // IMPORTANT: Adjust this URL to match your actual avatar API endpoint
    const avatarApiEndpoint = '/api/avatars/'; // Example: if your API is http://localhost:8080/avatars/
    return request.url.includes(avatarApiEndpoint);
  };

  const getMessage = (error: HttpErrorResponse) => {
    // Priorize mensagens que vêm do corpo da resposta da API
    if (error.error?.message) {
      return error.error.message;
    }
    if (error.error?.msg) {
      return error.error.msg;
    }
    // Mensagem específica para erros de sintaxe (pode indicar problema de rede/proxy)
    if (error.message.includes('SyntaxError: Unexpected token')) {
      return `Erro de comunicação com o servidor. Verifique sua conexão ou tente novamente.`;
    }
    // Mensagem genérica baseada no status HTTP
    return `Erro ${error.status}: ${error.statusText}`;
  };

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // Log detailed error for debugging
      console.error(`HTTP Error: ${error.status} ${error.statusText}`, {
        url: error.url,
        error: typeof error.error === 'string' ? error.error.substring(0, 200) : error.error,
        message: error.message,
        headers: req.headers,
        requestBody: req.body
      });

      // --- CRITICAL ADJUSTMENT HERE ---
      // If the error is 404 AND it's an avatar request, do NOT redirect or show global toast.
      // Instead, simply re-throw the error so the component's `subscribe().error` can handle it.
      if (error.status === STATUS.NOT_FOUND && isAvatarRequest(req)) {
        console.warn('Error Interceptor: Caught 404 for avatar request. Letting component handle it.');
        return throwError(() => error); // Re-throw the error
      }
      // --- END CRITICAL ADJUSTMENT ---

      // Original error handling logic for other errors or 404s not related to avatars
      if (errorPages.includes(error.status)) {
        router.navigateByUrl(`/${error.status}`, { skipLocationChange: true });
        toast.error(getMessage(error), 'Erro');
      } else if (error.status === STATUS.UNAUTHORIZED) {
        // ... (your existing 401 logic) ...
      } else {
        toast.error(getMessage(error), 'Erro');
      }

      return throwError(() => error);
    })
  );
}
