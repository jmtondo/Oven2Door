import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PaymentResultPage } from './payment-result.page';

describe('PaymentResultPage', () => {
  let component: PaymentResultPage;
  let fixture: ComponentFixture<PaymentResultPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(PaymentResultPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
