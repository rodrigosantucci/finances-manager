import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DashboardActionsComponent } from './dashboard-actions.component';

describe('DashboardActionsComponent', () => {
  let component: DashboardActionsComponent;
  let fixture: ComponentFixture<DashboardActionsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardActionsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DashboardActionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
