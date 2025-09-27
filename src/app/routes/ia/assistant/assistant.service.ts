import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class AssistantService {
  private apiUrl = '/api/analytics';

  constructor(private http: HttpClient) {}

  // Função utilitária para garantir que o campo 'analise' seja um objeto
  private parseAnalise(item: any): any {
    if (item?.analise && typeof item.analise === 'string') {
      try {
        item.analise = JSON.parse(item.analise);
      } catch (error) {
        console.error('Failed to parse analise:', error);
        item.analise = {};
      }
    }
    return item;
  }

  // Retorna a LISTA de todas as análises de Fundamentos para o usuário.
  // Assume o endpoint: /api/analytics/fundamentos/all/{usuarioId}
  getFundamentos(usuarioId: number | string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/fundamentos/all/${usuarioId}`).pipe(
      map((response: any[]) => response.map(this.parseAnalise))
    );
  }

  // Retorna a LISTA de todas as análises Técnicas.
  // Assume o endpoint: /api/analytics/tecnica/all/{usuarioId}
  getTecnica(usuarioId: number | string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/tecnica/all/${usuarioId}`).pipe(
      map((response: any[]) => response.map(this.parseAnalise))
    );
  }

  // Retorna a LISTA de todas as análises Pessoais.
  // Assume o endpoint: /api/analytics/pessoais/all/{usuarioId}
  getPessoais(usuarioId: number | string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/pessoais/all/${usuarioId}`).pipe(
      map((response: any[]) => response.map(this.parseAnalise))
    );
  }
}
