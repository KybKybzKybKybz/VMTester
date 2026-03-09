import { Component } from '@angular/core';

@Component({
  selector: 'app-footer',
  imports: [],
  templateUrl: './footer.html',
  styleUrl: './footer.css',
})
export class Footer {
  currentDate: number;

  constructor() {
    const now: Date = new Date();
    this.currentDate = now.getFullYear();
  }
}
