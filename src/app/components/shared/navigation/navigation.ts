import { Component, ViewChild, inject, signal, OnInit } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDrawer, MatSidenav, MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { LanguageSelectorComponent } from '../language-selector/language-selector.component';


export type MenuItem = {

}


@Component({

  selector: 'app-navigation',
  standalone: true,
  imports: [
    RouterLink,
    RouterLinkActive,
    MatToolbarModule,
    MatIconModule,
    MatButtonModule,
    MatSidenavModule,
    MatListModule,
    CommonModule,
    TranslateModule,
    LanguageSelectorComponent,
  ],

  templateUrl: './navigation.html',
  styleUrl: './navigation.css'
})



export class Navigation implements OnInit {
  @ViewChild('drawer') drawer!: MatDrawer;
  @ViewChild('sidenav') sidenav!: MatSidenav;

  private translate = inject(TranslateService);

  isOpen = false;
  sidenavOpen = false;

  // Translations as signals
  menuTitle = signal('MENU');
  dashboardLabel = signal('Dashboard');
  inventoryLabel = signal('Inventory');
  warehousesLabel = signal('Warehouses');
  usersLabel = signal('Users');
  settingsLabel = signal('Settings');
  profileLabel = signal('Profile');

  ngOnInit() {
    this.updateTranslations();

    // Subscribe to language changes
    this.translate.onLangChange.subscribe(() => {
      this.updateTranslations();
    });
  }

  private updateTranslations() {
    this.translate.get(['nav.dashboard', 'nav.inventory', 'nav.warehouses', 'nav.users', 'nav.settings', 'nav.profile'])
      .subscribe(translations => {
        this.dashboardLabel.set(translations['nav.dashboard']);
        this.inventoryLabel.set(translations['nav.inventory']);
        this.warehousesLabel.set(translations['nav.warehouses']);
        this.usersLabel.set(translations['nav.users']);
        this.settingsLabel.set(translations['nav.settings']);
        this.profileLabel.set(translations['nav.profile']);
        this.menuTitle.set('MENU'); // Keep as is or translate if needed
      });
  }

  testBackdropClick() {
    console.log('Backdrop clicked!');
    this.sidenav.close();
  }

  testClick() {
    console.log('Button clicked!');
  }

  toggleMenu() {
    this.drawer.toggle();
    this.isOpen = !this.isOpen;
  }
}