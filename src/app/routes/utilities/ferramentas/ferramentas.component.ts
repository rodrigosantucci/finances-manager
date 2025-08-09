import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTabsModule } from '@angular/material/tabs';
import { PageHeaderComponent } from '@shared';
import { MatCardModule } from '@angular/material/card';
import { InvestmentSimulatorComponent } from './investment-simulator/investment-simulator.component';
import { ContributionAllocatorComponent } from './contribution-allocator/contribution-allocator.component';
import { CeilingPriceCalculatorComponent } from './ceiling-price-calculator/ceiling-price-calculator.component';

@Component({
  selector: 'app-ferramentas',
  templateUrl: './ferramentas.component.html',
  styleUrls: ['./ferramentas.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    MatTabsModule,
    PageHeaderComponent,
    MatCardModule,
    InvestmentSimulatorComponent,
    ContributionAllocatorComponent,
    CeilingPriceCalculatorComponent
  ]
})
export class UtilitiesFerramentasComponent {}
