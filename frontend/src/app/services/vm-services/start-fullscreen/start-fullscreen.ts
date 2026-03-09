import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class StartFullscreen {
  startFullscreen() {
    const elem = document.documentElement;
    if (elem.requestFullscreen) elem.requestFullscreen();
  }
}
