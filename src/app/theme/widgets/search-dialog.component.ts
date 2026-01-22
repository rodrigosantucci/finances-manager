import { Component, EventEmitter, Output, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatAutocompleteModule, MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Menu, MenuChildrenItem, MenuService } from '@core/bootstrap/menu.service';
import { DashboardService, AtivoVO } from 'app/routes/dashboard/dashboard.service';
import { TranslateModule } from '@ngx-translate/core';

interface SearchItem {
  type: 'page' | 'asset';
  label: string;
  route?: string[];
  ticker?: string;
}

@Component({
  selector: 'app-search-dialog',
  standalone: true,
  templateUrl: './search-dialog.component.html',
  styleUrls: ['./search-dialog.component.scss'],
  imports: [
    CommonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatListModule,
    MatIconModule,
    FormsModule,
    TranslateModule,
    MatAutocompleteModule,
  ],
})
export class SearchDialogComponent implements OnInit {
  @Output() closeRequested = new EventEmitter<void>();
  private readonly dialogRef = inject(MatDialogRef<SearchDialogComponent>, { optional: true });
  private readonly router = inject(Router);
  private readonly menuService = inject(MenuService);
  private readonly dashboardService = inject(DashboardService);

  query = '';
  pageIndex: SearchItem[] = [];
  assetIndex: SearchItem[] = [];
  results: SearchItem[] = [];
  noResults = false;
  displayItemLabel = (item: SearchItem | string | null) => {
    if (!item || typeof item === 'string') return item ?? '';
    return item.label;
  };

  ngOnInit(): void {
    this.menuService.getAll().subscribe(menu => {
      this.pageIndex = this.flattenMenu(menu);
      this.updateResults();
    });
    const assets = this.dashboardService.getStoredPatrimonioCompleto();
    this.assetIndex = assets.map(a => ({
      type: 'asset',
      label: `${a.tickerFormatado} ${a.descricaoFormatada}`.trim(),
      ticker: a.tickerFormatado,
    }));
    this.updateResults();
  }

  onQueryChange(): void {
    this.noResults = false;
    this.updateResults();
  }

  select(item: SearchItem): void {
    if (item.type === 'page' && item.route) {
      const built = this.menuService.buildRoute(item.route);
      this.router.navigate([built]).then(() => this.close());
      return;
    }
    if (item.type === 'asset' && item.ticker) {
      this.router.navigate(['/assets/stats'], { queryParams: { ticker: item.ticker } }).then(() => this.close());
      return;
    }
  }

  onAutocompleteSelected(event: MatAutocompleteSelectedEvent): void {
    const item = event.option.value as SearchItem;
    this.select(item);
  }

  private updateResults(): void {
    const q = this.query.trim().toLowerCase();
    if (!q) {
      this.results = [];
      this.noResults = false;
      return;
    }
    
    const fromPages = this.pageIndex.filter(p => p.label.toLowerCase().includes(q));
    const fromAssets = this.assetIndex.filter(a => a.label.toLowerCase().includes(q));
    const combined = [...fromPages.slice(0, 10), ...fromAssets.slice(0, 10)];
    this.results = combined.slice(0, 20);
    if (this.results.length === 0) {
      this.noResults = true;
    }
  }

  private flattenMenu(menu: Menu[]): SearchItem[] {
    const items: SearchItem[] = [];
    const walk = (nodes: (Menu | MenuChildrenItem)[], parent: string[]) => {
      nodes.forEach(node => {
        const name = (node as any).name || '';
        const route = (node as any).route ? parent.concat([(node as any).route]) : parent;
        const type = (node as any).type;
        if (type === 'link' || type === 'extLink' || type === 'extTabLink') {
          items.push({ type: 'page', label: name, route });
        }
        if ((node as any).children && (node as any).children.length > 0) {
          walk((node as any).children, route);
        }
      });
    };
    walk(menu, []);
    return items;
  }

  close(): void {
    if (this.dialogRef) {
      this.dialogRef.close();
      return;
    }
    this.closeRequested.emit();
  }

  onSubmit(): void {
    this.updateResults();
    if (this.results.length > 0) {
      this.select(this.results[0]);
      return;
    }
    this.noResults = true;
  }
}
