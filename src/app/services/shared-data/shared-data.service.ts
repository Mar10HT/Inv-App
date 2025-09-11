import {Injectable, signal} from "@angular/core"

@Injectable({
  providedIn : "root"
})

export class SharedData{
  inputData = signal<string>("")

  constructor(){
    console.log("Data shared created with signals")
  }

  updateInputData(newData:string):void{
    console.log("Updating shared data to:", newData)
    this.inputData.set(newData)
  }

  getCurrentData():string{
    return this.inputData()
  }
}
