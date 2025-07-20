import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-branding',
  template: `
    <a class="branding" href="/">
       <img src="images/logo.png" class="branding-logo" alt="logo" />
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
      width: 10rem;
      height: 10rem;
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
