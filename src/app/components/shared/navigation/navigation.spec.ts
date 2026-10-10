import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { NgxPermissionsService } from 'ngx-permissions';

import { Navigation } from './navigation';
import { SidebarService } from '../../../services/sidebar.service';
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

  describe('the commercial group', () => {
    it('starts open, and toggles closed and back open', () => {
      expect(component.commercialOpen()).toBeTrue();

      component.commercialOpen.update((v) => !v);
      expect(component.commercialOpen()).toBeFalse();

      component.commercialOpen.update((v) => !v);
      expect(component.commercialOpen()).toBeTrue();
    });

    it('starts the Sales and Purchases submenus closed when the address matches neither', () => {
      expect(component.salesSubmenuOpen()).toBeFalse();
      expect(component.purchasesSubmenuOpen()).toBeFalse();
    });

    it('toggles the Sales submenu independently from Purchases', () => {
      component.salesSubmenuOpen.update((v) => !v);

      expect(component.salesSubmenuOpen()).toBeTrue();
      expect(component.purchasesSubmenuOpen()).toBeFalse();
    });
  });

  describe('the commercial group label', () => {
    // The label text only renders when the sidebar is expanded — collapsed mode
    // swaps it for an icon-only trigger with the same text in a (hidden until
    // hovered) tooltip, so it must be expanded for a textContent assertion to mean anything.
    const renderFor = async (permissions: string[]): Promise<void> => {
      TestBed.inject(SidebarService).isCollapsed.set(false);
      await TestBed.inject(NgxPermissionsService).loadPermissions(permissions);
      fixture.detectChanges();
      await new Promise((resolve) => setTimeout(resolve, 0));
      fixture.detectChanges();
    };

    it('is shown to someone who can see at least one of the commercial pages', async () => {
      await renderFor(['loans:view']);

      expect(fixture.nativeElement.textContent).toContain('NAV.COMMERCIAL');
    });

    it('is left out for someone with none of the commercial permissions', async () => {
      await renderFor(['inventory:view']);

      expect(fixture.nativeElement.textContent).not.toContain('NAV.COMMERCIAL');
    });
  });
});

describe('Navigation — opened directly on a Sales address', () => {
  it('opens the Sales submenu automatically, Purchases stays closed', async () => {
    await TestBed.configureTestingModule({
      imports: [Navigation],
      providers: [
        ...provideTestBedDefaults(),
        { provide: Router, useValue: { url: '/accounts-receivable' } }
      ]
    }).compileComponents();

    const fixture = TestBed.createComponent(Navigation);
    fixture.detectChanges();

    expect(fixture.componentInstance.salesSubmenuOpen()).toBeTrue();
    expect(fixture.componentInstance.purchasesSubmenuOpen()).toBeFalse();
  });
});

describe('Navigation — opened directly on a Purchases address', () => {
  it('opens the Purchases submenu automatically, Sales stays closed', async () => {
    await TestBed.configureTestingModule({
      imports: [Navigation],
      providers: [
        ...provideTestBedDefaults(),
        { provide: Router, useValue: { url: '/accounts-payable' } }
      ]
    }).compileComponents();

    const fixture = TestBed.createComponent(Navigation);
    fixture.detectChanges();

    expect(fixture.componentInstance.purchasesSubmenuOpen()).toBeTrue();
    expect(fixture.componentInstance.salesSubmenuOpen()).toBeFalse();
  });
});
