import { AfterViewInit, Component, Input, ViewChild } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-dashboard-positions',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatTableModule, MatPaginatorModule, MatSortModule, MatIconModule, CurrencyPipe, TranslateModule],
  templateUrl: './dashboard-positions.component.html',
  styleUrls: ['./dashboard-positions.component.scss']
})
export class DashboardPositionsComponent implements AfterViewInit {
  @Input() dataSource = new MatTableDataSource<any>([]);
  @Input() displayedColumns: string[] = ['ticker', 'categoria', 'valorAtual'];
  @Input() totalCarteira = 0;
  @Input() percentualExterior = 0;
  @Input() percentualBitcoin = 0;

  @Input() pageSize = 5;
  @Input() compact = false;

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  ngAfterViewInit(): void {
    if (this.dataSource) {
      this.dataSource.paginator = this.paginator;
      this.dataSource.sort = this.sort;
      this.dataSource.sortingDataAccessor = (item: any, property: string) => {
        const numericProps = ['valorAtual'];
        const value = item?.[property];
        if (numericProps.includes(property)) {
          const num = typeof value === 'string' ? parseFloat(value) : value;
          return isNaN(num) ? 0 : num ?? 0;
        }
        return typeof value === 'string' ? value.toLowerCase() : value ?? '';
      };
      // Default sort by valorAtual descending
      if (this.dataSource.data && this.dataSource.data.length > 0) {
        this.dataSource.data = [...this.dataSource.data].sort((a, b) => (b.valorAtual ?? 0) - (a.valorAtual ?? 0));
      }
    }
  }
}
