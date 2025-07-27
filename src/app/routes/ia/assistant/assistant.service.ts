import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AssistantService {
  private apiUrl = '/api/analytics';

  constructor(private http: HttpClient) {}

  getFundamentos(usuarioId: number | string): Observable<any> {
    return this.http.get(`${this.apiUrl}/fundamentos/${usuarioId}`);
  }

  getTecnica(usuarioId: number | string): Observable<any> {
    return this.http.get(`${this.apiUrl}/tecnica/${usuarioId}`);
  }

  getPessoais(usuarioId: number | string): Observable<any> {
    return this.http.get(`${this.apiUrl}/pessoais/${usuarioId}`);
  }
}
