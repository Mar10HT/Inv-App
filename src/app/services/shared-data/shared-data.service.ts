import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class SharedData {
  inputData = signal<string>('');

  updateInputData(newData: string): void {
    this.inputData.set(newData);
  }

  getCurrentData(): string {
    return this.inputData();
  }
}
