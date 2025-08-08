import { Component, ViewChild } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDrawer, MatSidenav, MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { CommonModule } from '@angular/common';


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
  ],
  
  templateUrl: './navigation.html',
  styleUrl: './navigation.css'
})



export class Navigation {
  @ViewChild('drawer') drawer!: MatDrawer;
  isOpen = false;
  title = 'MENU';
  sidenavOpen = false;
  @ViewChild('sidenav') sidenav!: MatSidenav;

  testBackdropClick() {
  console.log('Backdrop clicked!');
  this.sidenav.close(); // You'll need to get reference to sidenav
  }
  testClick() {
  console.log('Button clicked!');
  }

  toggleMenu() {
    this.drawer.toggle();
    this.isOpen = !this.isOpen;
  }
}