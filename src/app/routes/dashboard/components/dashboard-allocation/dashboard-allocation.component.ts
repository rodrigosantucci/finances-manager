import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-dashboard-allocation',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule, TranslateModule],
  templateUrl: './dashboard-allocation.component.html',
  styleUrls: ['./dashboard-allocation.component.scss'],
})
export class DashboardAllocationComponent {
  @Input() percentualRF = 0;
  @Input() percentualRV = 0;
  @Input() percentualExterior = 0;
  @Input() percentualBitcoin = 0;
  @Input() valorRF = 0;
  @Input() valorRV = 0;
  @Input() valorExterior = 0;
  @Input() valorBitcoin = 0;
  @Input() showCard = true;
}
