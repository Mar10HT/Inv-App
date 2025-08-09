import { Component, computed, effect } from '@angular/core';
import { SharedData } from '../../../services/shared-data.service';

@Component({
  selector: 'app-inventory-list',
  imports: [],
  templateUrl: './inventory-list.html',
  styleUrl: './inventory-list.css'
})
export class InventoryList {
    receivedData = computed(() =>{
      const data = this.sharedData.inputData()
      console.log("Inventory component recieved the data", data)
      return data
    })

    uppercaseData = computed(()=>{
      return this.receivedData().toUpperCase();
    })

    constructor(private sharedData: SharedData){
      effect(()=>{
        const currentData = this.receivedData()
        if(currentData){
          console.log("Effect triggered! Data is now:", currentData)
        }
      })
    }
    showAlert():void{
      alert(`Current shared data: ${this.receivedData()}`) 
    }
  

}
