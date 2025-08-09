import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ContributionAllocatorComponent } from './contribution-allocator.component';

describe('ContributionAllocatorComponent', () => {
  let component: ContributionAllocatorComponent;
  let fixture: ComponentFixture<ContributionAllocatorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ContributionAllocatorComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ContributionAllocatorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
