import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { format } from 'date-fns';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-date-range-filter',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatButtonModule,
    MatIconModule,
    TranslateModule,
  ],
  templateUrl: './date-range-filter.component.html',
  styleUrls: ['./date-range-filter.component.scss'],
})
export class DateRangeFilterComponent {
  startDate: Date | null = null;
  endDate: Date | null = null;
  @Output() apply = new EventEmitter<{ start?: string; end?: string }>();

  onDateRangeChange(e: any) {
    this.startDate = e?.value?.start ?? this.startDate;
    this.endDate = e?.value?.end ?? this.endDate;
  }

  onApply() {
    const start = this.startDate instanceof Date ? format(this.startDate, 'yyyy-MM-dd') : undefined;
    const end = this.endDate instanceof Date ? format(this.endDate, 'yyyy-MM-dd') : undefined;
    this.apply.emit({ start, end });
  }
}
