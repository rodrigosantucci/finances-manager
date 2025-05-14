import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
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
  ],
})
export class TransactionDialogComponent implements OnInit {
  transactionForm: FormGroup;
  isSubmitting = false;

  // Transaction type options
  transactionTypes = [
    { value: 'COMPRA', label: 'Compra' },
    { value: 'VENDA', label: 'Venda' },
  ];

  // Asset type options with tipoAtivo mapping
  assetTypes = [
    { value: 'AÇÃO', label: 'Ação', tipoAtivo: 1 },
    { value: 'TÍTULO', label: 'Título', tipoAtivo: 2 },
    { value: 'MOEDA', label: 'Moeda', tipoAtivo: 3 },
  ];

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<TransactionDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { patrimonioId?: number; usuarioId?: number },
    @Inject(TransacaoService) private transactionService: TransacaoService,
    private snackBar: MatSnackBar
  ) {
    this.transactionForm = this.fb.group({
      ticker: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(10)]],
      assetType: ['', Validators.required],
      transactionType: ['', Validators.required],
      description: ['', this.descriptionValidator.bind(this)],
      quantity: ['', [Validators.required, Validators.min(1)]],
      averagePrice: ['', [Validators.required, Validators.min(0.01)]],
      transactionValue: ['', [Validators.required, Validators.min(0.01)]],
      date: ['', Validators.required],
    });
  }

  ngOnInit(): void {
    // Subscribe to assetType changes to update description validation
    this.transactionForm.get('assetType')?.valueChanges.subscribe(() => {
      this.transactionForm.get('description')?.updateValueAndValidity();
    });
  }

  // Custom validator for description based on assetType
  descriptionValidator(control: AbstractControl): ValidationErrors | null {
    const assetType = this.transactionForm?.get('assetType')?.value;
    const value = control.value?.toString().trim();

    if (!value) {
      return { required: true };
    }

    if (assetType === 'TÍTULO') {
      // Expect a positive number (percentage, e.g., "5.5" or "5.5%")
      const cleanedValue = value.replace('%', '');
      const numValue = parseFloat(cleanedValue);
      if (isNaN(numValue) || numValue <= 0) {
        return { invalidPercentage: true };
      }
    } else if (assetType === 'MOEDA') {
      // Expect a positive number (currency, e.g., "5.30")
      const numValue = parseFloat(value);
      if (isNaN(numValue) || numValue <= 0) {
        return { invalidCurrency: true };
      }
    } else {
      // For AÇÃO or others, just ensure non-empty string
      if (value.length === 0) {
        return { required: true };
      }
    }

    return null;
  }

  onSubmit(): void {
    if (this.transactionForm.valid && !this.isSubmitting) {
      this.isSubmitting = true;
      const formValue = { ...this.transactionForm.value };

      // Normalize description for TÍTULO
      if (formValue.assetType === 'TÍTULO') {
        formValue.description = formValue.description.replace('%', '');
      }

      // Format date to YYYY-MM-DD
      let dataTransacao: string;
      if (formValue.date instanceof Date) {
        const year = formValue.date.getFullYear();
        const month = String(formValue.date.getMonth() + 1).padStart(2, '0');
        const day = String(formValue.date.getDate()).padStart(2, '0');
        dataTransacao = `${year}-${month}-${day}`;
      } else {
        dataTransacao = formValue.date;
      }

      // Map assetType to tipoAtivo
      const selectedAssetType = this.assetTypes.find(type => type.value === formValue.assetType);
      const tipoAtivo = selectedAssetType ? selectedAssetType.tipoAtivo : 1;

      // Map form values to Transacao interface
      const transacao: Transacao = {
        ticker: formValue.ticker,
        dataTransacao,
        tipoTransacao: formValue.transactionType,
        tipoAtivo,
        quantidade: parseFloat(formValue.quantity),
        valorTransacao: parseFloat(formValue.transactionValue),
        moeda: 'BRL', // Hardcoded, adjust if needed
        observacao: formValue.description,
        corretora: 'Default', // Hardcoded, adjust if needed
        usuarioId: 1, // Default to 1, adjust based on auth
      };

      // Send POST request
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
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onClean(): void {
    this.transactionForm.reset();
  }
}
