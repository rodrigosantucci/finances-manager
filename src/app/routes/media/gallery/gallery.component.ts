import { Component, OnInit } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatLineModule } from '@angular/material/core';
import { MatGridListModule } from '@angular/material/grid-list';
import { MtxPhotoviewerModule } from '@ng-matero/extensions/photoviewer';

import { PageHeaderComponent } from '@shared';

@Component({
  selector: 'app-media-gallery',
  templateUrl: './gallery.component.html',
  styleUrl: './gallery.component.scss',
  imports: [MatGridListModule, MatLineModule, MtxPhotoviewerModule, PageHeaderComponent,  MatGridListModule, MatLineModule, MatCardModule],
})
export class MediaGalleryComponent implements OnInit {
  dir = 'images/pixabay/';
  images: any[] = [];

  dogs = [
    { name: 'Porter', human: 'Kara' },
    { name: 'Mal', human: 'Jeremy' },
    { name: 'Koby', human: 'Igor' },
    { name: 'Razzle', human: 'Ward' },
    { name: 'Molly', human: 'Rob' },
    { name: 'Husi', human: 'Matias' },
  ];

  tiles = [
    { text: 'Cappuccino', cols: 3, rows: 1, color: 'lightblue' },
    { text: 'Mocha', cols: 1, rows: 2, color: 'lightgreen' },
    { text: 'Latte', cols: 1, rows: 1, color: 'lightpink' },
    { text: 'Iced coffee', cols: 2, rows: 1, color: '#DDBDF1' },
  ];

  fixedCols = 4;
  fixedRowHeight = 100;
  ratioGutter = '1';
  fitListHeight = '400px';
  ratio = '4:1';

  ngOnInit(): void {
    for (let i = 1; i <= 20; i++) {
      this.images.push({
        title: i,
        src: this.dir + i + '.jpg',
      });
    }
  }
}
