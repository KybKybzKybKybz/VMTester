import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

type HamburgerType = {
    id: number
}

@Component({
  selector: 'app-header',
  imports: [CommonModule],
  templateUrl: './header.html',
  styleUrl: './header.css',
})


export class Header {
  items: HamburgerType[] = [
    {id: 1},
    {id: 2},
    {id: 3}
  ]

  menuValue: boolean = false;
  openMenu() {
    this.menuValue = !this.menuValue
  };

  menuClasses(itemId: number){
    if(this.menuValue){
      switch(itemId){
        case 1: return 'translate-y-[20px] rotate-45';
        case 2: return 'opacity-0';
        case 3: return '-translate-y-[22px] -rotate-45';
        default: return '';
      }
    } else {
      switch(itemId){
        default: return 'translate-y-0 opacity-100 rotate-0';
      }
    }
    
  }
}
