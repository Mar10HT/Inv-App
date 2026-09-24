import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Settings } from './settings';
import { ThemeService } from '../../services/theme.service';
import { provideTestBedDefaults } from '../../../testing/test-providers';

describe('Settings theme toggle', () => {
  let fixture: ComponentFixture<Settings>;
  let component: Settings;
  let theme: ThemeService;

  const dataTheme = (): string | null => document.documentElement.getAttribute('data-theme');

  beforeEach(async () => {
    localStorage.setItem('theme', 'dark');

    await TestBed.configureTestingModule({
      imports: [Settings],
      providers: [...provideTestBedDefaults()]
    }).compileComponents();

    theme = TestBed.inject(ThemeService);
    fixture = TestBed.createComponent(Settings);
    component = fixture.componentInstance;
    fixture.detectChanges();
    TestBed.tick();
  });

  afterEach(() => {
    localStorage.removeItem('theme');
    document.documentElement.removeAttribute('data-theme');
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('starts in the theme the app is in', () => {
    expect(component.darkMode()).toBeTrue();
    expect(theme.isDark()).toBeTrue();
  });

  it('switches the whole app theme, not just its own switch', () => {
    component.toggleDarkMode();
    TestBed.tick();

    expect(theme.isDark()).toBeFalse();
    expect(dataTheme()).toBe('light');
    expect(localStorage.getItem('theme')).toBe('light');
  });

  it('follows a theme change made somewhere else, such as the navigation toggle', () => {
    theme.toggle();
    TestBed.tick();
    fixture.detectChanges();

    expect(component.darkMode()).toBeFalse();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('SETTINGS.LIGHT_MODE');
  });

  it('lets the navigation toggle work right after Settings changed the theme', () => {
    component.toggleDarkMode();
    TestBed.tick();
    expect(dataTheme()).toBe('light');

    // One click on the navigation toggle must flip it back, not appear to do nothing.
    theme.toggle();
    TestBed.tick();

    expect(dataTheme()).toBe('dark');
  });
});
