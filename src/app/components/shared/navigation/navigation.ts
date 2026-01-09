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
    this.translate.get(['NAV.DASHBOARD', 'NAV.INVENTORY', 'NAV.WAREHOUSES', 'NAV.USERS', 'NAV.SETTINGS', 'NAV.PROFILE'])
      .subscribe(translations => {
        this.dashboardLabel.set(translations['NAV.DASHBOARD']);
        this.inventoryLabel.set(translations['NAV.INVENTORY']);
        this.warehousesLabel.set(translations['NAV.WAREHOUSES']);
        this.usersLabel.set(translations['NAV.USERS']);
        this.settingsLabel.set(translations['NAV.SETTINGS']);
        this.profileLabel.set(translations['NAV.PROFILE']);
        this.menuTitle.set('MENU');
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