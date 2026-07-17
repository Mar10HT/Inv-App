import { TestBed } from '@angular/core/testing';

import { SharedData } from './shared-data.service';
import { provideTestBedDefaults } from '../../../testing/test-providers';

describe('SharedData', () => {
  let service: SharedData;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [...provideTestBedDefaults()]
    });
    service = TestBed.inject(SharedData);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
