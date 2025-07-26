// src/app/core/interceptors/error-interceptor.ts
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

  const isLoginRequest = (request: HttpRequest<unknown>): boolean => {
    // **AJUSTE este caminho '/api/auth/login' para o ENDPOINT REAL da sua API de login**
    const loginApiEndpoint = '/api/auth/login';
    return request.url.includes(loginApiEndpoint);
  };

  const isAvatarRequest = (request: HttpRequest<unknown>): boolean => {
    const avatarApiEndpoint = '/api/avatars/';
    return request.url.includes(avatarApiEndpoint);
  };

  const getMessage = (error: HttpErrorResponse) => {
    if (error.error?.message) {
      return error.error.message;
    }
    if (error.error?.msg) {
      return error.error.msg;
    }
    if (error.message.includes('SyntaxError: Unexpected token')) {
      return `Erro de comunicação com o servidor. Verifique sua conexão ou tente novamente.`;
    }
    return `Erro ${error.status}: ${error.statusText}`;
  };

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      console.error(`HTTP Error: ${error.status} ${error.statusText}`, {
        url: error.url,
        error: typeof error.error === 'string' ? error.error.substring(0, 200) : error.error,
        message: error.message,
        headers: req.headers,
        requestBody: req.body
      });

      if (error.status === STATUS.NOT_FOUND && isAvatarRequest(req)) {
        console.warn('Error Interceptor: Caught 404 for avatar request. Letting component handle it.');
        return throwError(() => error);
      }

      // --- Adicione esta lógica para o 401 no login ---
      if (error.status === STATUS.UNAUTHORIZED && isLoginRequest(req)) {
        // Para requisições de login 401, não fazemos nada aqui (não mostra toast, não redireciona),
        // pois o LoginComponent já lidará com a mensagem de "Login ou senha inválidos".
        console.warn('Error Interceptor: Caught 401 for login request. Letting component handle it.');
        return throwError(() => error); // Re-throw para que o componente possa tratar.
      }
      // --- Fim da lógica para 401 no login ---

      if (errorPages.includes(error.status)) {
        router.navigateByUrl(`/${error.status}`, { skipLocationChange: true });
        toast.error(getMessage(error), 'Erro');
      } else if (error.status === STATUS.UNAUTHORIZED) {
        // Esta parte do código será para 401s que NÃO são da rota de login
        // Ex: token expirado em uma rota protegida.
        // Aqui você pode decidir se quer redirecionar para o login
        // ou mostrar um toast genérico de "Não autorizado".
        // router.navigateByUrl('/auth/login', { queryParams: { returnUrl: router.url } });
        toast.error('Sessão expirada ou não autorizada. Por favor, faça login novamente.', 'Não Autorizado');
      } else {
        toast.error(getMessage(error), 'Erro');
      }

      return throwError(() => error);
    })
  );
}
