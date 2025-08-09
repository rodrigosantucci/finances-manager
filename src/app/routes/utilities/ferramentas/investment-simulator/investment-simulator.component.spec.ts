import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InvestmentSimulatorComponent } from './investment-simulator.component';

describe('InvestmentSimulatorComponent', () => {
  let component: InvestmentSimulatorComponent;
  let fixture: ComponentFixture<InvestmentSimulatorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InvestmentSimulatorComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InvestmentSimulatorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
