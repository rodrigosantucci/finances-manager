import { Component, OnInit, ViewChild, AfterViewInit, inject, ChangeDetectorRef } from '@angular/core';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule, Sort } from '@angular/material/sort';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { FormsModule } from '@angular/forms';
import { NgIf, CurrencyPipe } from '@angular/common';
import { MatSnackBar } from '@angular/material/snack-bar';
import { forkJoin, of } from 'rxjs';
import { catchError, finalize, take } from 'rxjs/operators';
import { format } from 'date-fns';
import { PageHeaderComponent } from '@shared';
import { HistoricoTransacaoVO, DadosService, AtivoCotacao } from './dados.service';
import { AuthService } from '@core/authentication';
import { DateRangeFilterComponent } from './date-range-filter.component';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-historico-dados',
  templateUrl: './dados.component.html',
  styleUrls: ['./dados.component.scss'],
  standalone: true,
  imports: [
    PageHeaderComponent,
    MatCardModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatInputModule,
    MatFormFieldModule,
    MatProgressSpinnerModule,
    MatIconModule,
    MatButtonModule,
    MatDatepickerModule,
    FormsModule,
    NgIf,
    CurrencyPipe,
    DateRangeFilterComponent,
    TranslateModule,
  ],
})
export class HistoricoDadosComponent implements OnInit, AfterViewInit {
  private readonly dadosService = inject(DadosService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly authService = inject(AuthService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly translate = inject(TranslateService);

  dataSource = new MatTableDataSource<HistoricoTransacaoVO>([]);
  displayedColumns: string[] = [
    'dataRegistro',
    'valorAcoes',
    'valorFundos',
    'valorCaixa',
    'valorAssetsInternacionais',
    'valorTotal',
    'ativos',
  ];

  @ViewChild(MatPaginator, { static: false }) paginator!: MatPaginator;
  @ViewChild(MatSort, { static: false }) sort!: MatSort;

  isLoading = true;
  hasError = false;
  currentUserId: number | string | null = null;
  private allData: HistoricoTransacaoVO[] = [];

  ngOnInit() {
    this.authService.user().pipe(take(1)).subscribe(user => {
      if (user?.id) {
        this.currentUserId = user.id;
        this.loadData();
      } else {
        this.hasError = true;
        this.isLoading = false;
        this.snackBar.open(this.translate.instant('historico.errors.user_id_unavailable'), this.translate.instant('close'), {
          duration: 5000,
          panelClass: ['error-snackbar'],
        });
      }
    });
  }

  ngAfterViewInit() {
    setTimeout(() => {
      if (this.paginator && this.sort) {
        console.log('MatSort e MatPaginator inicializados com sucesso');
        this.dataSource.paginator = this.paginator;
        this.dataSource.sort = this.sort;
        this.cdr.detectChanges();
      } else {
        console.error('Erro: MatPaginator ou MatSort não inicializados', {
          paginator: !!this.paginator,
          sort: !!this.sort,
        });
      }

      this.dataSource.sortData = (data: HistoricoTransacaoVO[], sort: MatSort): HistoricoTransacaoVO[] => {
        const active = sort.active;
        const direction = sort.direction;
        console.log('Ordenando:', { active, direction, dataLength: data.length });
        if (!active || direction === '') {
          console.log('Nenhuma ordenação aplicada');
          return data;
        }

        return data.sort((a, b) => {
          const isAsc = direction === 'asc';
          switch (active) {
            case 'dataRegistro':
              return this.compare(a.dataRegistro, b.dataRegistro, isAsc, true);
            case 'valorAcoes':
              return this.compare(a.valorAcoes, b.valorAcoes, isAsc);
            case 'valorFundos':
              return this.compare(a.valorFundos, b.valorFundos, isAsc);
            case 'valorCaixa':
              return this.compare(a.valorCaixa, b.valorCaixa, isAsc);
            case 'valorAssetsInternacionais':
              return this.compare(a.valorAssetsInternacionais, b.valorAssetsInternacionais, isAsc);
            case 'valorTotal':
              return this.compare(a.valorTotal, b.valorTotal, isAsc);
            default:
              return 0;
          }
        });
      };
    }, 0);
  }

  private compare(a: any, b: any, isAsc: boolean, isDate = false): number {
    if (isDate) {
      if (a === 'N/A' && b === 'N/A') return 0;
      if (a === 'N/A') return isAsc ? -1 : 1;
      if (b === 'N/A') return isAsc ? 1 : -1;

      const [dayA, monthA, yearA] = a.split('/').map(Number);
      const [dayB, monthB, yearB] = b.split('/').map(Number);
      const dateA = new Date(yearA, monthA - 1, dayA);
      const dateB = new Date(yearB, monthB - 1, dayB);
      return (dateA.getTime() - dateB.getTime()) * (isAsc ? 1 : -1);
    }

    const valueA = Number(a) || 0;
    const valueB = Number(b) || 0;
    return (valueA - valueB) * (isAsc ? 1 : -1);
  }

  onSortChange(sort: Sort) {
    console.log('Evento matSortChange disparado:', { active: sort.active, direction: sort.direction });
  }

  loadData(dataInicio?: string, dataFim?: string) {
    this.isLoading = true;
    this.hasError = false;

    forkJoin([
      this.dadosService.getHistoricoTransacoes(dataInicio, dataFim).pipe(
        catchError(error => {
          console.error('Erro ao carregar histórico de transações:', error);
          this.snackBar.open(this.translate.instant('historico.errors.load_transactions_failed'), this.translate.instant('close'), {
            duration: 5000,
            panelClass: ['error-snackbar'],
          });
          this.hasError = true;
          return of([]);
        })
      ),
    ])
      .pipe(finalize(() => {
        this.isLoading = false;
      }))
      .subscribe(([transacoes]) => {
        console.log('Dados recebidos do serviço:', transacoes);
        this.allData = transacoes;
        this.dataSource.data = this.allData;

        try {
          window.dispatchEvent(new CustomEvent('app:data-updated', { detail: { context: 'historico-dados' } }));
        } catch { void 0; }

        setTimeout(() => {
          if (this.paginator && this.sort) {
            this.dataSource.paginator = this.paginator;
            this.dataSource.sort = this.sort;
            console.log('MatSort e MatPaginator reatribuídos após carregamento');
            this.cdr.detectChanges();
          } else {
            console.error('Erro: MatSort ou MatPaginator não disponíveis após carregamento', {
              paginator: !!this.paginator,
              sort: !!this.sort,
            });
          }
        }, 0);
      });
  }

  onApplyDateRange(range: { start?: string; end?: string }) {
    const startDate = range.start ? new Date(range.start) : null;
    const endDate = range.end ? new Date(range.end) : null;
    if (startDate) startDate.setHours(0, 0, 0, 0);
    if (endDate) endDate.setHours(23, 59, 59, 999);
    if (!startDate && !endDate) {
      this.dataSource.data = this.allData;
      if (this.paginator) this.paginator.firstPage();
      return;
    }
    const filtered = this.allData.filter(item => {
      if (!item?.dataRegistro || item.dataRegistro === 'N/A') return false;
      const [day, month, year] = item.dataRegistro.split('/').map(Number);
      const date = new Date(year, (month || 1) - 1, day || 1);
      if (isNaN(date.getTime())) return false;
      if (startDate && date < startDate) return false;
      if (endDate && date > endDate) return false;
      return true;
    });
    this.dataSource.data = filtered;
    if (this.paginator) this.paginator.firstPage();
  }

  retryLoadData() {
    if (this.currentUserId) {
      this.loadData();
    }
  }

  downloadAtivosCSV(ativos: AtivoCotacao[]) {
    if (!ativos || ativos.length === 0) {
      this.snackBar.open('Não há ativos para download.', 'Fechar', { duration: 3000 });
      return;
    }
    const headers = ['ticker', 'cotacao', 'quantidade', 'cambio'];
    const csvContent = [
      headers.join(','),
      ...ativos.map(ativo => `${ativo.ticker},${ativo.cotacao},${ativo.quantidade},${ativo.cambio}`)
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    const fileName = `ativos.csv`;
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
