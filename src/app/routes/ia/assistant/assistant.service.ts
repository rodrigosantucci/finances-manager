import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { LocalStorageService } from '@shared';

@Injectable({
  providedIn: 'root'
})
export class AssistantService {
  private defaultApiPrefix = '/api/analytics';
  constructor(private http: HttpClient, private storage: LocalStorageService) {}

  private hasHttpScheme(url: string): boolean {
    return /^http(s)?:\/\//i.test(url);
  }

  private joinUrlSegments(base: string, path: string): string {
    return `${base.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
  }

  private getAnalyticsUrl(): string {
    const endpoint = this.storage.get('ai.backendEndpoint') as string | null;
    if (endpoint && this.hasHttpScheme(endpoint)) {
      return this.joinUrlSegments(endpoint, 'analytics');
    }
    return this.defaultApiPrefix;
  }

  private getAIHeaders(): HttpHeaders {
    const geminiKey = (this.storage.get('ai.key.gemini') as string | null) ?? (this.storage.get('ai.geminiKey') as string | null);
    const openaiKey = (this.storage.get('ai.key.openai') as string | null) ?? (this.storage.get('ai.openaiKey') as string | null);
    let provider: string | null = null;
    let key = '';
    if (openaiKey) {
      provider = 'openai';
      key = openaiKey;
    } else if (geminiKey) {
      provider = 'gemini';
      key = geminiKey;
    }
    let headers = new HttpHeaders();
    if (provider) {
      headers = headers.set('X-AI-Provider', provider);
    }
    if (key) {
      headers = headers.set('X-AI-Api-Key', key);
    }
    return headers;
  }

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
    return this.http.get<any[]>(`${this.getAnalyticsUrl()}/fundamentos/all/${usuarioId}`).pipe(
      // CORREÇÃO: Usar uma função de seta para preservar o contexto 'this' da classe
      map((response: any[]) => response.map(item => this.parseAnalise(item)))
    );
  }

  // Retorna a LISTA de todas as análises Técnicas.
  getTecnica(usuarioId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.getAnalyticsUrl()}/tecnica/all/${usuarioId}`).pipe(
      // CORREÇÃO: Usar uma função de seta para preservar o contexto 'this' da classe
      map((response: any[]) => response.map(item => this.parseAnalise(item)))
    );
  }

  // Retorna a LISTA de todas as análises Pessoais.
  getPessoais(usuarioId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.getAnalyticsUrl()}/pessoais/all/${usuarioId}`).pipe(
      // CORREÇÃO: Usar uma função de seta para preservar o contexto 'this' da classe
      map((response: any[]) => response.map(item => this.parseAnalise(item)))
    );
  }

  createPessoais(usuarioId: number): Observable<any> {
    return this.http.post(`${this.getAnalyticsUrl()}/pessoais/${usuarioId}`, {}, { headers: this.getAIHeaders() });
  }

  createTecnica(usuarioId: number): Observable<any> {
    return this.http.post(`${this.getAnalyticsUrl()}/tecnica/${usuarioId}`, {}, { headers: this.getAIHeaders() });
  }

  createFundamentos(usuarioId: number): Observable<any> {
    return this.http.post(`${this.getAnalyticsUrl()}/fundamentos/${usuarioId}`, {}, { headers: this.getAIHeaders() });
  }

  deleteAnalyticsById(id: number): Observable<any> {
    return this.http.delete(`${this.getAnalyticsUrl()}/${id}`);
  }

  deleteAnalyticsByUserAndType(usuarioId: number, tipo: string): Observable<any> {
    return this.http.delete(`${this.getAnalyticsUrl()}/${usuarioId}/${tipo}`);
  }

  processFileWithAI(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file, file.name);

    return this.http.post(`${this.getAnalyticsUrl()}/smart-import`, formData, { headers: this.getAIHeaders() });
  }
}
