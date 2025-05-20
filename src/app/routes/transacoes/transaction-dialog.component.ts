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
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatStepperModule } from '@angular/material/stepper';
import { MatStepper } from '@angular/material/stepper';
import { TransacaoService, Transacao } from './transaction.service';
import { HttpClientModule } from '@angular/common/http';

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
  ],
  providers: [
    { provide: MAT_DATE_LOCALE, useValue: 'pt-BR' }
  ]
})
export class TransactionDialogComponent implements OnInit {
  @ViewChild('stepper') stepper!: MatStepper;

  // FormGroups para cada etapa na nova ordem
  formGroupStep1: FormGroup; // Tipo de Operação, Tipo de Ativo
  formGroupStep2: FormGroup; // Ticker, Descrição, Quantidade
  formGroupStep3: FormGroup; // Corretora
  formGroupStep4: FormGroup; // Data da Transação
  formGroupStep5: FormGroup; // Preço Médio, Valor da Transação

  transactionForm: FormGroup; // FormGroup principal que engloba os outros

  isSubmitting = false;

  transactionTypes = [
    { value: 'COMPRA', label: 'Compra' },
    { value: 'VENDA', label: 'Venda' },
  ];

  assetTypes = [
    { value: 'AÇÃO', label: 'Ação', tipoAtivo: 1 },
    { value: 'FUNDO', label: 'Fundo', tipoAtivo: 2 },
    { value: 'TÍTULO', label: 'Título', tipoAtivo: 3 },
    { value: 'MOEDA', label: 'Moeda', tipoAtivo: 4 },
  ];

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<TransactionDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { patrimonioId?: number; usuarioId?: number },
    @Inject(TransacaoService) private transactionService: TransacaoService,
    private snackBar: MatSnackBar
  ) {
    // Inicialize os FormGroups para cada etapa na nova ordem
    this.formGroupStep1 = this.fb.group({
      transactionType: ['', Validators.required],
      assetType: ['', Validators.required],
    });

    this.formGroupStep2 = this.fb.group({
      ticker: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(10)]],
      description: ['', this.descriptionValidator.bind(this)],
      quantity: ['', [Validators.required, Validators.min(1)]],
    });

    this.formGroupStep3 = this.fb.group({
      corretora: ['', Validators.required],
    });

    this.formGroupStep4 = this.fb.group({
      date: ['', Validators.required],
    });

    this.formGroupStep5 = this.fb.group({
      averagePrice: ['', [Validators.required, Validators.min(0.01)]],
      transactionValue: ['', [Validators.required, Validators.min(0.01)]],
    });

    // Crie o FormGroup principal combinando os FormGroups das etapas
    this.transactionForm = this.fb.group({
      step1: this.formGroupStep1,
      step2: this.formGroupStep2,
      step3: this.formGroupStep3,
      step4: this.formGroupStep4,
      step5: this.formGroupStep5,
    });
  }

  ngOnInit(): void {
    // A validação da descrição depende do assetType que agora está no formGroupStep1
    this.formGroupStep1.get('assetType')?.valueChanges.subscribe(() => {
      this.formGroupStep2.get('description')?.updateValueAndValidity();
    });
  }

  // Validador customizado para descrição baseado no assetType
  descriptionValidator(control: AbstractControl): ValidationErrors | null {
    // Acesse o valor do assetType através do FormGroup principal (agora em step1)
    const assetType = this.transactionForm?.get('step1.assetType')?.value;
    const value = control.value?.toString().trim();

    if (!value) {
      return { required: true };
    }

    if (assetType === 'TÍTULO') {
      const cleanedValue = value.replace('%', '');
      const numValue = parseFloat(cleanedValue);
      if (isNaN(numValue) || numValue <= 0) {
        return { invalidPercentage: true };
      }
    } else if (assetType === 'MOEDA') {
      const numValue = parseFloat(value);
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

      // Combine os valores de todos os FormGroups das etapas
      const formValue = {
        ...this.formGroupStep1.value,
        ...this.formGroupStep2.value,
        ...this.formGroupStep3.value,
        ...this.formGroupStep4.value,
        ...this.formGroupStep5.value,
      };

      // Normalizar descrição para TÍTULO
      if (formValue.assetType === 'TÍTULO') {
        formValue.description = formValue.description.replace('%', '');
      }

      // Formatar data para YYYY-MM-DD
      let dataTransacao: string;
      if (formValue.date instanceof Date) {
        const year = formValue.date.getFullYear();
        const month = String(formValue.date.getMonth() + 1).padStart(2, '0');
        const day = String(formValue.date.getDate()).padStart(2, '0');
        dataTransacao = `${year}-${month}-${day}`;
      } else {
        dataTransacao = formValue.date;
      }

      // Mapear assetType para tipoAtivo
      const selectedAssetType = this.assetTypes.find(type => type.value === formValue.assetType);
      const tipoAtivo = selectedAssetType ? selectedAssetType.tipoAtivo : 1;

      // Mapear valores do formulário para a interface Transacao
      const transacao: Transacao = {
        ticker: formValue.ticker,
        dataTransacao,
        tipoTransacao: formValue.transactionType,
        tipoAtivo,
        quantidade: parseFloat(formValue.quantity),
        valorTransacao: parseFloat(formValue.transactionValue),
        moeda: 'BRL',
        observacao: formValue.description,
        corretora: formValue.corretora,
        usuarioId: this.data.usuarioId || 1,
      };

      // Enviar requisição POST
      this.transactionService.createTransacao(transacao).subscribe({
        next: (createTransacao: Transacao) => {
          this.snackBar.open('Transação criada com sucesso!', 'Fechar', {
            duration: 3000,
            panelClass: ['success-snackbar'],
          });
          this.dialogRef.close(createTransacao);
          this.isSubmitting = false;
        },
        error: (error: any) => {
          console.error('Erro ao criar transação:', error);
          this.snackBar.open(error.message || 'Erro ao criar transação', 'Fechar', {
            duration: 5000,
            panelClass: ['error-snackbar'],
          });
          this.isSubmitting = false;
        },
      });
    } else {
      this.snackBar.open('Por favor, preencha todos os campos obrigatórios ou corrija os erros.', 'Fechar', {
        duration: 5000,
        panelClass: ['error-snackbar'],
      });
      // Marcar todos os campos como "touched" para exibir erros
      this.markAllAsTouched(this.transactionForm);
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onClean(): void {
    this.transactionForm.reset();
    // Resetar cada FormGroup das etapas individualmente
    this.formGroupStep1.reset();
    this.formGroupStep2.reset();
    this.formGroupStep3.reset();
    this.formGroupStep4.reset();
    this.formGroupStep5.reset();
    // Voltar para a primeira etapa do stepper
    this.stepper.reset();
  }

  // Função auxiliar para marcar todos os controles de um FormGroup como touched
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
