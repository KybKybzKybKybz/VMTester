import { TestBed } from '@angular/core/testing';

import { EnvironmentScan } from './environment-scan';

describe('EnvironmentScan', () => {
  let service: EnvironmentScan;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(EnvironmentScan);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
