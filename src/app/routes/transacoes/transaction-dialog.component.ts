import { Component, Inject, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule, MAT_DATE_LOCALE } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatStepperModule } from '@angular/material/stepper';
import { MatStepper } from '@angular/material/stepper';
import { TransacaoService, Transacao } from './transaction.service';
import { HttpClientModule } from '@angular/common/http';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-transaction-dialog',
  templateUrl: './transaction-dialog.component.html',
  styleUrls: ['./transaction-dialog.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatSelectModule,
    MatDialogModule,
    MatIconModule,
    MatSnackBarModule,
    HttpClientModule,
    MatStepperModule,
    TranslateModule,
  ],
  providers: [
    { provide: MAT_DATE_LOCALE, useValue: 'pt-BR' },
    CurrencyPipe,
  ]
})
export class TransactionDialogComponent implements OnInit {
  @ViewChild('stepper') stepper!: MatStepper;

  formGroupDadosIniciais: FormGroup;
  formGroupDetalhesAtivo: FormGroup;
  formGroupValoresData: FormGroup;

  transactionForm: FormGroup;

  isSubmitting = false;

  transactionTypes = [
    { value: 'COMPRA', label: 'Compra' },
    { value: 'VENDA', label: 'Venda' },
  ];

  assetTypes = [
    { value: 'AÇÃO', label: 'Ação', tipoAtivo: 1, category: 'acoes' },
    { value: 'FUNDO', label: 'Fundo', tipoAtivo: 2, category: 'fundos' },
    { value: 'TÍTULO', label: 'Título', tipoAtivo: 3, category: 'assets' },
    { value: 'MOEDA', label: 'Moeda', tipoAtivo: 4, category: 'caixa' },
    { value: 'AÇÃO_EXTERIOR', label: 'Ação Exterior', tipoAtivo: 4, category: 'acoes' },
    { value: 'FUNDO_EXTERIOR', label: 'Fundo Exterior', tipoAtivo: 4, category: 'fundos' },
  ];

  brokers = [
    'XP Investimentos',
    'BTG Pactual',
    'Banco Inter',
    'Banco Itaú',
    'Banco do Brasil',
    'Santander',
    'Bradesco',
    'Banco Safra',
    'Avenue',
    'Clear Corretora',
    'Rico',
    'Nubank',
    'Inter',
    'Genial Investimentos',
    'Outra'
  ];

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<TransactionDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { patrimonioId?: number; usuarioId?: number },
    @Inject(TransacaoService) private transactionService: TransacaoService,
    private snackBar: MatSnackBar,
    private currencyPipe: CurrencyPipe,
    private translate: TranslateService
  ) {
    this.formGroupDadosIniciais = this.fb.group({
      transactionType: ['', Validators.required],
      assetType: ['', Validators.required],
    });

    this.formGroupDetalhesAtivo = this.fb.group({
      ticker: ['', [Validators.minLength(1), Validators.maxLength(10)]],
      description: ['', this.descriptionValidator.bind(this)],
      quantity: ['', [Validators.min(1)]],
      corretora: ['', Validators.required],
    });

    this.formGroupValoresData = this.fb.group({
      date: ['', Validators.required],
      averagePrice: ['', [Validators.min(0.01)]],
      transactionValue: ['', [Validators.required, Validators.min(0.01)]],
    });

    this.transactionForm = this.fb.group({
      dadosIniciais: this.formGroupDadosIniciais,
      detalhesAtivo: this.formGroupDetalhesAtivo,
      valoresData: this.formGroupValoresData,
    });
  }

  ngOnInit(): void {
    this.formGroupDadosIniciais.get('assetType')?.valueChanges.subscribe((value: string) => {
      console.log('Selected assetType:', value);
      this.updateFormValidations(value);
      this.formGroupDetalhesAtivo.get('description')?.updateValueAndValidity();
    });
  }

  private updateFormValidations(assetType: string): void {
    const tickerControl = this.formGroupDetalhesAtivo.get('ticker');
    const quantityControl = this.formGroupDetalhesAtivo.get('quantity');
    const averagePriceControl = this.formGroupValoresData.get('averagePrice');

    if (assetType === 'TÍTULO') {
      tickerControl?.setValidators([Validators.minLength(1), Validators.maxLength(10)]);
      quantityControl?.setValidators([Validators.min(0)]);
      averagePriceControl?.setValidators([Validators.min(0.01)]);
      tickerControl?.setValue('');
      quantityControl?.setValue('');
      averagePriceControl?.setValue('');
    } else {
      tickerControl?.setValidators([Validators.required, Validators.minLength(1), Validators.maxLength(10)]);
      quantityControl?.setValidators([Validators.required, Validators.min(0)]);
      averagePriceControl?.setValidators([Validators.required, Validators.min(0.01)]);
    }

    tickerControl?.updateValueAndValidity();
    quantityControl?.updateValueAndValidity();
    averagePriceControl?.updateValueAndValidity();
  }

  descriptionValidator(control: AbstractControl): ValidationErrors | null {
    const assetType = this.formGroupDadosIniciais.get('assetType')?.value;
    const value = control.value?.toString().trim();

    if (!value) {
      return { required: true };
    }

    if (assetType === 'MOEDA') {
      const cleanedValue = value.replace(/\./g, '').replace(',', '.');
      const numValue = parseFloat(cleanedValue);
      if (isNaN(numValue) || numValue <= 0) {
        return { invalidCurrency: true };
      }
    } else {
      if (value.length === 0) {
        return { required: true };
      }
    }
    return null;
  }

  onSubmit(): void {
    if (this.transactionForm.valid && !this.isSubmitting) {
      this.isSubmitting = true;

      const formValue = {
        ...this.formGroupDadosIniciais.value,
        ...this.formGroupDetalhesAtivo.value,
        ...this.formGroupValoresData.value,
      };

      console.log('Form Value:', formValue);

      if (!formValue.assetType) {
        this.snackBar.open(this.translate.instant('transaction.messages.asset_type_not_selected'), this.translate.instant('close'), {
          duration: 5000,
          panelClass: ['error-snackbar'],
        });
        this.isSubmitting = false;
        return;
      }

      if (formValue.assetType === 'TÍTULO') {
        formValue.description = formValue.description.replace('%', '');
      }
      if (formValue.assetType === 'TÍTULO' || formValue.assetType === 'MOEDA') {
        formValue.description = formValue.description.replace(/\./g, '').replace(',', '.');
      }

      let dataTransacao: string;
      if (formValue.date instanceof Date) {
        const year = formValue.date.getFullYear();
        const month = String(formValue.date.getMonth() + 1).padStart(2, '0');
        const day = String(formValue.date.getDate()).padStart(2, '0');
        dataTransacao = `${year}-${month}-${day}`;
      } else {
        dataTransacao = formValue.date;
      }

      const selectedAssetType = this.assetTypes.find(type => type.value === formValue.assetType);
      if (!selectedAssetType) {
        this.snackBar.open(this.translate.instant('transaction.messages.invalid_asset_type'), this.translate.instant('close'), {
          duration: 5000,
          panelClass: ['error-snackbar'],
        });
        this.isSubmitting = false;
        return;
      }
      const tipoAtivo = selectedAssetType.tipoAtivo;
      const category = selectedAssetType.category;

      const averagePriceParsed = formValue.averagePrice ?
        (typeof formValue.averagePrice === 'string' ? parseFloat(formValue.averagePrice.replace(/\./g, '').replace(',', '.')) : formValue.averagePrice) : 0;
      const transactionValueParsed = typeof formValue.transactionValue === 'string' ?
        parseFloat(formValue.transactionValue.replace(/\./g, '').replace(',', '.')) : formValue.transactionValue;

      const moeda = ['AÇÃO_EXTERIOR', 'FUNDO_EXTERIOR', 'MOEDA'].includes(formValue.assetType) ? 'USD' : 'BRL';

      const transacao: Transacao = {
        ticker: formValue.assetType === 'TÍTULO' ? '' : formValue.ticker,
        dataTransacao,
        tipoTransacao: formValue.transactionType,
        tipoAtivo,
        quantidade: formValue.assetType === 'TÍTULO' ? 0 : parseFloat(formValue.quantity),
        valorTransacao: transactionValueParsed,
        moeda,
        observacao: formValue.description,
        corretora: formValue.corretora,
        usuario: this.data.usuarioId ? { id: this.data.usuarioId } : undefined,
        category,
      };

      console.log('Transacao Object:', transacao);

      this.transactionService.createTransacao(transacao).subscribe({
        next: (createTransacao: Transacao) => {
          this.snackBar.open(this.translate.instant('transaction.messages.created_success'), this.translate.instant('close'), {
            duration: 3000,
            panelClass: ['success-snackbar'],
          });
          this.dialogRef.close(createTransacao);
          this.isSubmitting = false;
        },
        error: (error: any) => {
          console.error('Erro ao criar transação:', error);
          this.snackBar.open(error.message || this.translate.instant('transaction.messages.create_error'), this.translate.instant('close'), {
            duration: 5000,
            panelClass: ['error-snackbar'],
          });
          this.isSubmitting = false;
        },
      });
    } else {
      this.snackBar.open(this.translate.instant('transaction.messages.fill_required_or_fix_errors'), this.translate.instant('close'), {
        duration: 5000,
        panelClass: ['error-snackbar'],
      });
      this.markAllAsTouched(this.transactionForm);
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onClean(): void {
    this.transactionForm.reset();
    this.formGroupDadosIniciais.reset();
    this.formGroupDetalhesAtivo.reset();
    this.formGroupValoresData.reset();
    this.stepper.reset();
  }

  private markAllAsTouched(formGroup: FormGroup | AbstractControl): void {
    if (formGroup instanceof FormGroup) {
      Object.values(formGroup.controls).forEach(control => {
        control.markAsTouched();
        if (control instanceof FormGroup) {
          this.markAllAsTouched(control);
        }
      });
    }
  }
}
