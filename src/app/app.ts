import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Navigation } from './components/shared/navigation/navigation';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    Navigation,
  ],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  title = 'ICN';
}