import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Structure } from './structure';

describe('Structure', () => {
  let component: Structure;
  let fixture: ComponentFixture<Structure>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Structure]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Structure);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
