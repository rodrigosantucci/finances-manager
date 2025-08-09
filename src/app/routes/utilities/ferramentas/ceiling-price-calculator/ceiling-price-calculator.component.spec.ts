import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CeilingPriceCalculatorComponent } from './ceiling-price-calculator.component';

describe('CeilingPriceCalculatorComponent', () => {
  let component: CeilingPriceCalculatorComponent;
  let fixture: ComponentFixture<CeilingPriceCalculatorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CeilingPriceCalculatorComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CeilingPriceCalculatorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
