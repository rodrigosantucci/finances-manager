import { Component, OnInit } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser'; // Import SafeResourceUrl
import { CommonModule } from '@angular/common';
import { MatTabsModule } from '@angular/material/tabs';
import { PageHeaderComponent } from '@shared';
import { MatCard, MatCardContent } from '@angular/material/card';

@Component({
  selector: 'app-ferramentas',
  templateUrl: './ferramentas.component.html',
  styleUrls: ['./ferramentas.component.scss'],
  standalone: true,
  imports: [CommonModule, MatTabsModule, PageHeaderComponent, MatCardContent, MatCard]
})
export class UtilitiesFerramentasComponent implements OnInit {
  iframeSrc1: SafeResourceUrl | undefined;
  iframeSrc2: SafeResourceUrl | undefined;
  iframeSrc3: SafeResourceUrl | undefined;

  constructor(private sanitizer: DomSanitizer) {}

  ngOnInit(): void {
    // Gera URLs seguras para os iframes
    this.iframeSrc1 = this.sanitizer.bypassSecurityTrustResourceUrl('assets/calculadora-preco-teto/index.html');
    this.iframeSrc2 = this.sanitizer.bypassSecurityTrustResourceUrl('assets/distribuidor-aporte/index.html');
    this.iframeSrc3 = this.sanitizer.bypassSecurityTrustResourceUrl('assets/simulador-investimentos/index.html');
  }
}
