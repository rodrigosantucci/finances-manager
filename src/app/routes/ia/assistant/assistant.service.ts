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

  /**
   * Função utilitária para converter datas do formato DD.MM.YYYY para YYYY-MM-DD (ISO 8601).
   * Isso corrige o erro 'InvalidPipeArgument' do Angular DatePipe.
   */
  private convertDate(dateString: string): string {
    // Verifica se a string está no formato 'DD.MM.YYYY'
    if (dateString && typeof dateString === 'string' && dateString.match(/^\d{2}\.\d{2}\.\d{4}$/)) {
      const parts = dateString.split('.');
      // Converte para YYYY-MM-DD
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return dateString;
  }

  // Função utilitária para garantir que o campo 'analise' seja um objeto e corrigir o formato da data
  private parseAnalise(item: any): any {
    // 1. Tratamento existente do campo 'analise' (JSON String)
    if (item?.analise && typeof item.analise === 'string') {
      try {
        item.analise = JSON.parse(item.analise);
      } catch (error) {
        console.error('Failed to parse analise:', error);
        item.analise = {};
      }
    }

    // 2. CORREÇÃO DO FORMATO DA DATA
    if (item?.data && typeof item.data === 'string') {
      item.data = this.convertDate(item.data); // << ESTA LINHA AGORA FUNCIONARÁ CORRETAMENTE
    }

    return item;
  }

  // Retorna a LISTA de todas as análises de Fundamentos para o usuário.
  getFundamentos(usuarioId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/fundamentos/all/${usuarioId}`).pipe(
      // CORREÇÃO: Usar uma função de seta para preservar o contexto 'this' da classe
      map((response: any[]) => response.map(item => this.parseAnalise(item)))
    );
  }

  // Retorna a LISTA de todas as análises Técnicas.
  getTecnica(usuarioId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/tecnica/all/${usuarioId}`).pipe(
      // CORREÇÃO: Usar uma função de seta para preservar o contexto 'this' da classe
      map((response: any[]) => response.map(item => this.parseAnalise(item)))
    );
  }

  // Retorna a LISTA de todas as análises Pessoais.
  getPessoais(usuarioId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/pessoais/all/${usuarioId}`).pipe(
      // CORREÇÃO: Usar uma função de seta para preservar o contexto 'this' da classe
      map((response: any[]) => response.map(item => this.parseAnalise(item)))
    );
  }

  createPessoais(usuarioId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/pessoais/${usuarioId}`, {});
  }

  createTecnica(usuarioId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/tecnica/${usuarioId}`, {});
  }

  createFundamentos(usuarioId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/fundamentos/${usuarioId}`, {});
  }
}
