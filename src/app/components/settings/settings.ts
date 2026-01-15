import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-settings',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    MatIconModule,
    MatSnackBarModule,
    TranslateModule
  ],
  templateUrl: './settings.html',
  styleUrl: './settings.css'
})
export class Settings implements OnInit {
  private snackBar = inject(MatSnackBar);
  private translate = inject(TranslateService);

  currentLang = signal<string>('en');
  darkMode = signal<boolean>(true);
  emailNotifications = signal<boolean>(true);
  lowStockAlerts = signal<boolean>(true);
  exporting = signal<boolean>(false);

  ngOnInit(): void {
    // Load saved preferences
    const savedLang = localStorage.getItem('language') || 'en';
    this.currentLang.set(savedLang);

    const savedTheme = localStorage.getItem('theme');
    this.darkMode.set(savedTheme !== 'light');

    const savedEmailNotif = localStorage.getItem('emailNotifications');
    this.emailNotifications.set(savedEmailNotif !== 'false');

    const savedLowStockAlerts = localStorage.getItem('lowStockAlerts');
    this.lowStockAlerts.set(savedLowStockAlerts !== 'false');
  }

  changeLang(lang: string): void {
    this.translate.use(lang);
    this.currentLang.set(lang);
    localStorage.setItem('language', lang);
  }

  toggleDarkMode(): void {
    const newValue = !this.darkMode();
    this.darkMode.set(newValue);
    const theme = newValue ? 'dark' : 'light';
    localStorage.setItem('theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
  }

  toggleEmailNotifications(): void {
    const newValue = !this.emailNotifications();
    this.emailNotifications.set(newValue);
    localStorage.setItem('emailNotifications', String(newValue));
  }

  toggleLowStockAlerts(): void {
    const newValue = !this.lowStockAlerts();
    this.lowStockAlerts.set(newValue);
    localStorage.setItem('lowStockAlerts', String(newValue));
  }

  exportData(): void {
    this.exporting.set(true);
    // Simulate export
    setTimeout(() => {
      this.exporting.set(false);
      this.snackBar.open('Data exported successfully', 'Close', {
        duration: 3000,
        panelClass: ['snackbar-success']
      });
    }, 1500);
  }

  resetData(): void {
    if (confirm('Are you sure you want to reset all data? This action cannot be undone.')) {
      this.snackBar.open('All data has been reset', 'Close', {
        duration: 3000,
        panelClass: ['snackbar-warning']
      });
    }
  }
}
