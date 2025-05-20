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
      // Log detalhado do erro para debug
      console.error(`HTTP Error: ${error.status} ${error.statusText}`, {
        url: error.url,
        error: typeof error.error === 'string' ? error.error.substring(0, 200) : error.error,
        message: error.message,
        headers: req.headers,
        requestBody: req.body // Pode ser útil para debug de login
      });

      // Trata status de erro específicos
      if (errorPages.includes(error.status)) {
        // Redireciona para páginas de erro genéricas (403, 404, 500)
        router.navigateByUrl(`/${error.status}`, {
          skipLocationChange: true,
        });
        // Exibe uma mensagem genérica para esses erros também
        toast.error(getMessage(error), 'Erro');
      } else if (error.status === STATUS.UNAUTHORIZED) {
        // **Tratamento Específico para 401**
        if (isLoginRequest(req)) {
          // Se for a requisição de login e retornar 401
          toast.error('Email ou senha inválidos. Por favor, tente novamente.', 'Erro de Autenticação');
          // Não redireciona aqui, pois o usuário já está na tela de login
        } else {
          // Se for 401 em outra requisição (token expirado/inválido)
          toast.warning('Sua sessão expirou ou é inválida. Por favor, faça login novamente.', 'Sessão Expirada');
          // Redireciona para a tela de login
          router.navigateByUrl('/auth/login');
          // O tokenInterceptor também limpa o token nesse caso, o que é bom.
        }
      } else {
        // Trata outros erros HTTP não especificados acima
        toast.error(getMessage(error), 'Erro');
      }

      // Retorna o erro para que o componente que fez a requisição possa tratá-lo se necessário
      return throwError(() => error);
    })
  );
}
