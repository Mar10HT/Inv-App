import { Component, inject, computed } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { LanguageSelectorComponent } from '../language-selector/language-selector.component';
import { AuthService } from '../../../services/auth.service';
import { SidebarService } from '../../../services/sidebar.service';

@Component({
  selector: 'app-navigation',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    RouterLinkActive,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    TranslateModule,
    LanguageSelectorComponent,
  ],
  templateUrl: './navigation.html',
  styleUrl: './navigation.css'
})
export class Navigation {
  private authService = inject(AuthService);
  private sidebarService = inject(SidebarService);

  currentUser = computed(() => this.authService.currentUser());
  isCollapsed = computed(() => this.sidebarService.isCollapsed());

  toggleSidebar(): void {
    this.sidebarService.toggle();
  }
}
