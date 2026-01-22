import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class FormatService {
  formatCurrency(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.value) {
      const value = this.unformatCurrency(input.value);
      input.value = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    }
  }

  formatInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    let value = input.value.replace(/\D/g, '');
    if (value) {
      value = (parseInt(value, 10) / 100).toFixed(2);
      input.value = value.replace('.', ',');
    } else {
      input.value = '';
    }
  }

  formatPercentageInput(event: Event, isCeilingPrice = false): void {
    const input = event.target as HTMLInputElement;
    let value = isCeilingPrice ? input.value.replace(/[^0-9]/g, '') : input.value.replace(/[^0-9,]/g, '');
    if (!isCeilingPrice) {
      const parts = value.split(',');
      if (parts.length > 2) {
        value = parts[0] + ',' + parts.slice(1).join('');
      }
      if (value.indexOf(',') === -1 && value.length > 2) {
        value = value.substring(0, value.length - 2) + ',' + value.substring(value.length - 2);
      }
      input.value = value;
    } else if (value) {
      input.value = value;
    }
  }

  formatPercentageBlur(event: Event, isCeilingPrice = false): void {
    const input = event.target as HTMLInputElement;
    if (input.value) {
      if (isCeilingPrice) {
        const value = parseFloat(input.value);
        input.value = value + '%';
      } else {
        if (!input.value.includes(',')) {
          input.value = input.value + ',00';
        } else {
          const parts = input.value.split(',');
          if (parts[1].length === 0) {
            input.value = input.value + '00';
          } else if (parts[1].length === 1) {
            input.value = input.value + '0';
          }
        }
      }
    }
  }

  unformatCurrency(text: string): number {
    if (!text) return 0;
    return parseFloat(text.replace(/[R$\s.]/g, '').replace(',', '.'));
  }

  unformatPercentage(text: string, isCeilingPrice = false): number {
    if (!text) return 0;
    return isCeilingPrice ? parseFloat(text.replace('%', '')) / 100 : parseFloat(text.replace(',', '.'));
  }
}
