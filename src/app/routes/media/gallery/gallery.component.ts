import { Component, inject, NgModule, OnInit } from '@angular/core';
import { FormsModule, NgModel } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatLineModule } from '@angular/material/core';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatIconModule } from '@angular/material/icon';
import { MtxPhotoviewerModule } from '@ng-matero/extensions/photoviewer';
import { MtxSelectModule } from '@ng-matero/extensions/select';


import { PageHeaderComponent } from '@shared';

@Component({
  selector: 'app-media-gallery',
  templateUrl: './gallery.component.html',
  styleUrl: './gallery.component.scss',
  imports: [
    MatGridListModule,
    MatLineModule,
    MtxPhotoviewerModule,
    PageHeaderComponent,
    MatGridListModule,
    MatLineModule,
    MatCardModule,
    MtxSelectModule,
    MatFormFieldModule,
    MtxSelectModule,
    FormsModule,
    MatIconModule,
  ],
})
export class MediaGalleryComponent implements OnInit {

private readonly dialog = inject(MatDialog);


  companies: any[] = [];
  loading = false;
  companiesNames = ['BBDC4', 'ITSA4', 'BACR4', 'PETR3', 'VALE3', 'ABEV3', 'ITUB4', 'BBAS3', 'WEGE3', 'LREN3'];
  selectedCompanyCustom = null;

  tiles = [
    { text: '1', cols: 3, rows: 1, color: 'lightblue' },
    { text: '2', cols: 1, rows: 2, color: 'lightgreen' },
    { text: '3', cols: 1, rows: 1, color: 'lightpink' },
    { text: '4', cols: 2, rows: 1, color: '#DDBDF1' },
  ];

  fixedCols = 4;
  fixedRowHeight = 100;
  ratioGutter = '1';
  fitListHeight = '400px';
  ratio = '4:1';

  ngOnInit(): void {

  }

  addTag(name: string) {
    return { name, tag: true };
  }

  addTagPromise(name: string) {
    return new Promise(resolve => {
      this.loading = true;
      setTimeout(() => {
        resolve({ id: 5, name, valid: true });
        this.loading = false;
      }, 1000);
    });
  }
}
