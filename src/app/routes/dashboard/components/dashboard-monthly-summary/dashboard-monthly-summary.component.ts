import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule, CurrencyPipe, DecimalPipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatIconModule } from '@angular/material/icon';
import { Period } from '../../services/period-filter.service';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-dashboard-monthly-summary',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonToggleModule, MatIconModule, CurrencyPipe, DecimalPipe, TranslateModule],
  templateUrl: './dashboard-monthly-summary.component.html',
  styleUrls: ['./dashboard-monthly-summary.component.scss'],
})
export class DashboardMonthlySummaryComponent {
  @Input() currentValue = 0;
  @Input() initialValue = 0;
  @Input() title = 'Resumo Mensal';
  @Input() period: Period = '3M';
  @Input() showControls = true;
  @Input() showCard = true;
  @Output() periodChange = new EventEmitter<Period>();

  get difference(): number {
    return this.currentValue - this.initialValue;
  }

  get percentChange(): number {
    if (!this.initialValue || this.initialValue === 0) {
      return 0;
    }
    return (this.difference / this.initialValue) * 100;
  }

  get isPositive(): boolean {
    return this.difference >= 0;
  }

  onSelectPeriod(p: Period) {
    this.period = p;
    this.periodChange.emit(p);
  }
}
