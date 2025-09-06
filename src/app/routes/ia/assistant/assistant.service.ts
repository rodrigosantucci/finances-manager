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

  getFundamentos(usuarioId: number | string): Observable<any> {
    return this.http.get(`${this.apiUrl}/fundamentos/${usuarioId}`).pipe(
      map((response: any) => {
        if (response?.analise) {
          try {
            response.analise = JSON.parse(response.analise);
          } catch (error) {
            console.error('Failed to parse analise for fundamentos:', error);
            response.analise = {};
          }
        }
        return response;
      })
    );
  }

  getTecnica(usuarioId: number | string): Observable<any> {
    return this.http.get(`${this.apiUrl}/tecnica/${usuarioId}`).pipe(
      map((response: any) => {
        if (response?.analise) {
          try {
            response.analise = JSON.parse(response.analise);
          } catch (error) {
            console.error('Failed to parse analise for tecnica:', error);
            response.analise = {};
          }
        }
        return response;
      })
    );
  }

  getPessoais(usuarioId: number | string): Observable<any> {
    return this.http.get(`${this.apiUrl}/pessoais/${usuarioId}`).pipe(
      map((response: any) => {
        if (response?.analise) {
          try {
            response.analise = JSON.parse(response.analise);
          } catch (error) {
            console.error('Failed to parse analise for pessoais:', error);
            response.analise = {};
          }
        }
        return response;
      })
    );
  }
}
