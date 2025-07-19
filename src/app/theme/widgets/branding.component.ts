import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-branding',
  template: `
    <a class="branding" href="/">
       <img src="images/logo.png" class="branding-logo" alt="logo" />
      @if (showName) {
        <span class="branding-name">Gestor de Finanças</span>
      }
    </a>
  `,
  styles: `
    .branding {
      display: flex;
      align-items: center;
      margin: 0 0.5rem;
      text-decoration: none;
      white-space: nowrap;
      color: inherit;
      border-radius: 50rem;
    }

    .branding-logo {
      width: 1.5rem;
      height: 1.5rem;
      border-radius: 50rem;
    }

    .branding-name {
      margin: 0 0.2rem;
      font-size: 0.9rem;
      font-weight: 600;
    }
  `,
})
export class BrandingComponent {
  @Input() showName = true;
}
