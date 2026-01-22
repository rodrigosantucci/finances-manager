import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DashboardPositionsComponent } from './dashboard-positions.component';

describe('DashboardPositionsComponent', () => {
  let component: DashboardPositionsComponent;
  let fixture: ComponentFixture<DashboardPositionsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardPositionsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DashboardPositionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
