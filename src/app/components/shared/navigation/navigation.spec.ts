import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Navigation } from './navigation';
import { provideTestBedDefaults } from '../../../../testing/test-providers';

describe('Navigation', () => {
  let component: Navigation;
  let fixture: ComponentFixture<Navigation>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Navigation],
      providers: [...provideTestBedDefaults()]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Navigation);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('keeps the collapse toggle out of sidebar-top, whose overflow-x: hidden would clip it', () => {
    const el = fixture.nativeElement as HTMLElement;
    const toggle = el.querySelector('.toggle-btn');

    expect(toggle?.closest('.sidebar-top')).toBeNull();
    expect(toggle?.closest('.sidebar')).not.toBeNull();
  });
});
