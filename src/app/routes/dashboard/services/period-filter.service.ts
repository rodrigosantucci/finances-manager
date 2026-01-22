import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export type Period = '3M' | '6M' | '1Y' | '5Y' | '10Y' | '20Y';

@Injectable({
  providedIn: 'root',
})
export class PeriodFilterService {
  private readonly periodSubject = new BehaviorSubject<Period>('3M');

  get period$(): Observable<Period> {
    return this.periodSubject.asObservable();
  }

  getPeriod(): Period {
    return this.periodSubject.getValue();
  }

  setPeriod(p: Period): void {
    this.periodSubject.next(p);
  }
}
