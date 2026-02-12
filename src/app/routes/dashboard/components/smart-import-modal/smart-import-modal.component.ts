import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { TranslateModule } from '@ngx-translate/core';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

@Component({
  selector: 'app-smart-import-modal',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule, TranslateModule, MatSnackBarModule],
  templateUrl: './smart-import-modal.component.html',
  styleUrls: ['./smart-import-modal.component.scss']
})
export class SmartImportModalComponent {
  @Output() fileUploaded = new EventEmitter<File>();

  isDragging = false;
  selectedFile: File | null = null;

  readonly acceptedFileTypes = [
    'application/pdf',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv',
    'text/plain'
  ];
  readonly maxFileSize = 10 * 1024 * 1024; // 10MB

  constructor(
    public dialogRef: MatDialogRef<SmartImportModalComponent>,
    private snackBar: MatSnackBar
  ) {}

  closeModal(): void {
    this.dialogRef.close();
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      this.handleFile(event.dataTransfer.files[0]);
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.handleFile(input.files[0]);
    }
  }

  private handleFile(file: File): void {
    if (!this.isValidFileType(file)) {
      this.snackBar.open('Formato de arquivo não aceito. Formatos aceitos: PDF, XLS, XLSX, CSV, TXT.', 'Fechar', { duration: 5000 });
      return;
    }

    if (!this.isValidFileSize(file)) {
      this.snackBar.open('Tamanho máximo do arquivo é 10MB.', 'Fechar', { duration: 5000 });
      return;
    }

    this.selectedFile = file;
    this.fileUploaded.emit(file);
    this.snackBar.open(`Arquivo "${file.name}" carregado com sucesso!`, 'Fechar', { duration: 3000 });
    this.dialogRef.close(file); // Fecha o modal e retorna o arquivo
  }

  private isValidFileType(file: File): boolean {
    return this.acceptedFileTypes.includes(file.type);
  }

  private isValidFileSize(file: File): boolean {
    return file.size <= this.maxFileSize;
  }
}
