// quantidade-format.pipe.ts
import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'quantidadeFormat'
})
export class QuantidadeFormatPipe implements PipeTransform {
  transform(value: number | string): string {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;

    if (numValue === null || isNaN(numValue)) {
      return ''; // Ou qualquer outro valor padrão para nulo/inválido
    }

    // Verifica se o número tem parte decimal
    if (numValue % 1 === 0) {
      return numValue.toFixed(0); // Sem casas decimais
    } else {
      return numValue.toString(); // Com casas decimais (ou toFixed(X) para um número específico de casas)
    }
  }
}
