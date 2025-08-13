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
import { NgIf, CurrencyPipe, DecimalPipe } from '@angular/common';
import { MatSnackBar } from '@angular/material/snack-bar';
import { forkJoin, of } from 'rxjs';
import { catchError, finalize, take } from 'rxjs/operators';
import { PageHeaderComponent } from '@shared';
import { HistoricoTransacaoVO, DadosService, AtivoCotacao } from './dados.service';
import { AuthService } from '@core/authentication';

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
    NgIf,
    CurrencyPipe,
    DecimalPipe,
  ],
})
export class HistoricoDadosComponent implements OnInit, AfterViewInit {
  private readonly dadosService = inject(DadosService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly authService = inject(AuthService);
  private readonly cdr = inject(ChangeDetectorRef);

  dataSource = new MatTableDataSource<HistoricoTransacaoVO>([]);
  displayedColumns: string[] = [
    'dataRegistro',
    'valorAcoes',
    'valorFundos',
    'valorCaixa',
    'valorAssetsInternacionais',
    'valorTotal',
    'ativos', // Nova coluna para os ativos
  ];

  @ViewChild(MatPaginator, { static: false }) paginator!: MatPaginator;
  @ViewChild(MatSort, { static: false }) sort!: MatSort;

  isLoading = true;
  hasError = false;
  currentUserId: number | string | null = null;

  ngOnInit() {
    this.authService.user().pipe(take(1)).subscribe(user => {
      if (user?.id) {
        this.currentUserId = user.id;
        this.loadData();
      } else {
        this.hasError = true;
        this.isLoading = false;
        this.snackBar.open('Erro: ID do usuário não disponível.', 'Fechar', {
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

      // Listener para eventos de ordenação
      this.sort.sortChange.subscribe((sort: Sort) => {
        console.log('Evento matSortChange disparado:', { active: sort.active, direction: sort.direction });
      });

      // Configurar ordenação personalizada
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

  private compare(a: any, b: any, isAsc: boolean, isDate: boolean = false): number {
    if (isDate) {
      if (a === 'N/A' && b === 'N/A') return 0;
      if (a === 'N/A') return isAsc ? -1 : 1;
      if (b === 'N/A') return isAsc ? 1 : -1;

      const [dayA, monthA, yearA] = a.split('/').map(Number);
      const [dayB, monthB, yearB] = b.split('/').map(Number);
      const dateA = new Date(yearA, monthA - 1, dayA);
      const dateB = new Date(yearB, monthB - 1, dayB);
      console.log('Comparando datas:', { dateA, dateB, result: dateA.getTime() - dateB.getTime() });
      return (dateA.getTime() - dateB.getTime()) * (isAsc ? 1 : -1);
    }

    const valueA = a ?? 0;
    const valueB = b ?? 0;
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
          this.snackBar.open('Erro ao carregar histórico de transações.', 'Fechar', {
            duration: 5000,
            panelClass: ['error-snackbar'],
          });
          this.hasError = true;
          return of([]);
        })
      ),
    ])
      .pipe(
        finalize(() => {
          this.isLoading = false;
        })
      )
      .subscribe(([transacoes]) => {
        console.log('Dados recebidos do serviço:', transacoes);
        this.dataSource.data = transacoes;
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

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();

    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
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
