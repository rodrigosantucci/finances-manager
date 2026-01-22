import { Component, Input } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-dashboard-stats',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule, CurrencyPipe, TranslateModule],
  templateUrl: './dashboard-stats.component.html',
  styleUrls: ['./dashboard-stats.component.scss']
})
export class DashboardStatsComponent {
  @Input() totalInvestido = 0;
  @Input() totalLucroPrejuizo = 0;
  @Input() totalValorExterior = 0;
  @Input() percentualRF = 0;
  @Input() percentualRV = 0;
  @Input() percentualExterior = 0;
  @Input() percentualBitcoin = 0;
  @Input() showCard = true;
}
