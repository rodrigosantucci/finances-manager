
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { MatIconButton } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIcon } from '@angular/material/icon';
import { MatProgressBar } from '@angular/material/progress-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import {  PageHeaderComponent } from '@shared';

@Component({
  selector: 'app-ia-assistant',
  templateUrl: './assistant.component.html',
  styleUrl: './assistant.component.scss',
  imports: [MatCardModule,
    PageHeaderComponent,
    MatCardModule,
    MatTabsModule,
    MatIcon,
  MatIconButton],
})
export class IaAssistantComponent {



  // Standard tabs demo
  tabs = [
    {
      label: 'Análise de Fundamentos',
      content: `The German Shepherd is a breed of medium to large-sized working dog that originated
          in Germany. The breed's officially recognized name is German Shepherd Dog in the
          English language. The breed is also known as the Alsatian in Britain and Ireland.`,
    },
    {
      label: 'Análise Técnica',
      extraContent: true,
      content: `The Labrador Retriever, also Labrador, is a type of retriever-gun dog. The Labrador
          is one of the most popular breeds of dog in the United Kingdom and the United States.`,
    },
    {
      label: 'Objetivos Pessoais',
      disabled: false,
      content: `The Rottweiler is a breed of domestic dog, regarded as medium-to-large or large.
          The dogs were known in German as Rottweiler Metzgerhund, meaning Rottweil butchers' dogs,
          because their main use was to ...`,
    },
  ];




  loadAssistantData(): void {
    // Logic to load assistant data can be added here
    console.log('Loading assistant data...');
  }


}





