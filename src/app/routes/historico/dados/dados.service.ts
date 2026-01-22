import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map, switchMap, take } from 'rxjs/operators';
import { AuthService } from '@core/authentication';
import { format, parse, parseISO } from 'date-fns';

export interface AtivoCotacao {
  cambio: number;
  ticker: string;
  cotacao: number;
  quantidade: number;
}

export interface HistoricoTransacaoVO {
  dataRegistro: string;
  valorAcoes: number;
  valorFundos: number;
  valorCaixa: number;
  valorAssetsInternacionais: number;
  valorTotal: number;
  ativosCotacoes: AtivoCotacao[];
}

@Injectable({
  providedIn: 'root',
})
export class DadosService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly apiPatrimoniosPrefix = '/api/patrimonios/usuario/';

  private getUsuarioIdObservable(): Observable<number | null | undefined> {
    return this.authService.user().pipe(
      take(1),
      map(user => user?.id)
    );
  }

  private formatDate(dateString: string | null | undefined): string {
    if (!dateString) {
      console.warn('Data vazia ou nula:', dateString);
      return 'N/A';
    }

    let parsedDate: Date | null = null;
    const trimmed = String(dateString).trim();
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
      parsedDate = parse(trimmed, 'dd/MM/yyyy', new Date());
    } else if (/^\d{4}-\d{2}-\d{2}([ T]\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})?)?$/.test(trimmed)) {
      parsedDate = parseISO(trimmed);
      if (isNaN(parsedDate.getTime())) {
        parsedDate = parse(trimmed.slice(0, 10), 'yyyy-MM-dd', new Date());
      }
    } else if (!isNaN(Number(trimmed))) {
      const epoch = Number(trimmed);
      parsedDate = new Date(epoch);
    }

    if (parsedDate && !isNaN(parsedDate.getTime())) {
      return format(parsedDate, 'dd/MM/yyyy');
    }

    console.warn('Data inválida:', dateString);
    return 'N/A';
  }

  getHistoricoTransacoes(dataInicio?: string, dataFim?: string): Observable<HistoricoTransacaoVO[]> {
    return this.getUsuarioIdObservable().pipe(
      switchMap(usuarioId => {
        if (usuarioId === undefined || usuarioId === null) {
          console.error('ID do usuário não disponível para buscar histórico de transações.');
          return of([]);
        }

        let params = new HttpParams();
        if (dataInicio) {
          params = params.set('dataInicio', dataInicio);
        }
        if (dataFim) {
          params = params.set('dataFim', dataFim);
        }

        const url = `${this.apiPatrimoniosPrefix}${usuarioId}/historico`;
        return this.http.get<any[]>(url, { params }).pipe(
          map(transacoes => {
            console.log('Dados brutos do endpoint:', transacoes);
            return transacoes.map(t => ({
              dataRegistro: this.formatDate(t.dataRegistro),
              valorAcoes: t.valorAcoes ?? 0,
              valorFundos: t.valorFundos ?? 0,
              valorCaixa: t.valorCaixa ?? 0,
              valorAssetsInternacionais: t.valorAssetsInternacionais ?? 0,
              valorTotal: t.valorTotal ?? 0,
              ativosCotacoes: t.ativosCotacoes ?? [],
            }));
          }),
          catchError(error => {
            console.error('Erro ao buscar histórico de transações:', error);
            return of([]);
          })
        );
      })
    );
  }
}
