import { TestBed } from '@angular/core/testing';

import { CountVMFactors } from './count-vmfactors';

describe('CountVMFactors', () => {
  let service: CountVMFactors;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CountVMFactors);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
