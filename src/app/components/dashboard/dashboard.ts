import { Component } from '@angular/core';
import { SharedData } from '../../services/shared-data.service';
import { FormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';

@Component({
  selector: 'app-dashboard',
  imports: [ FormsModule, MatFormFieldModule, MatInputModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class Dashboard {
  inputValue: string = '';

  constructor(private sharedData: SharedData){
    console.log("Dashboard component created!")
  };


  onInputChange(): void{
    console.log("Input changed to:", this.inputValue);
    this.sharedData.updateInputData(this.inputValue);
  };

  clearInput(): void{
    this.inputValue = "";
    this.sharedData.updateInputData("")
  };
   testClick(): void {
    console.log("Button clicked!");
    this.inputValue = "Button works!";
  }

}
