import { TestBed } from '@angular/core/testing';

import { StartFullscreen } from './start-fullscreen';

describe('StartFullscreen', () => {
  let service: StartFullscreen;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(StartFullscreen);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
