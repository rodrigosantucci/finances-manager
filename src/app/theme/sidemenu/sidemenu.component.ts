import { animate, state, style, transition, trigger } from '@angular/animations';
import { AsyncPipe, NgTemplateOutlet, SlicePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  Input,
  ViewEncapsulation,
  inject,
  OnInit
} from '@angular/core';
import { MatRippleModule } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
// import { NgxPermissionsModule } from 'ngx-permissions'; // <-- REMOVIDO AQUI

import { MenuService } from '@core';
import { NavAccordionItemDirective } from './nav-accordion-item.directive';
import { NavAccordionToggleDirective } from './nav-accordion-toggle.directive';
import { NavAccordionDirective } from './nav-accordion.directive';

@Component({
  selector: 'app-sidemenu',
  templateUrl: './sidemenu.component.html',
  styleUrl: './sidemenu.component.scss',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AsyncPipe,
    SlicePipe,
    NgTemplateOutlet,
    RouterLink,
    RouterLinkActive,
    // NgxPermissionsModule, // <-- REMOVIDO AQUI
    MatIconModule,
    MatRippleModule,
    TranslateModule,
    NavAccordionDirective,
    NavAccordionItemDirective,
    NavAccordionToggleDirective,
  ],
  animations: [
    trigger('expansion', [
      state('collapsed, void', style({ height: '0px', visibility: 'hidden' })),
      state('expanded', style({ height: '*', visibility: '' })),
      transition(
        'expanded <=> collapsed, void => collapsed',
        animate('225ms cubic-bezier(0.4,0,0.2,1)')
      ),
    ]),
  ],
})
export class SidemenuComponent implements OnInit {
  @Input() ripple = false;

  private readonly menu = inject(MenuService);

  menu$ = this.menu.getAll();

  buildRoute = this.menu.buildRoute;

  ngOnInit(): void {
    this.menu$.subscribe(menuItems => {
   //   console.log('SidemenuComponent: Itens de menu recebidos:', menuItems);
    });
  }
}
