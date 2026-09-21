import { TestBed } from '@angular/core/testing';

import { SkeletonComponent } from './skeleton';
import { SkeletonTableComponent } from './skeleton-table';
import { provideTestBedDefaults } from '../../../../testing/test-providers';

describe('SkeletonComponent', () => {
  const create = async () => {
    await TestBed.configureTestingModule({
      imports: [SkeletonComponent],
      providers: [...provideTestBedDefaults()]
    }).compileComponents();
    const fixture = TestBed.createComponent(SkeletonComponent);
    const block = () => (fixture.nativeElement as HTMLElement).querySelector('div') as HTMLElement;
    return { fixture, block };
  };

  it('defaults to a full-width rounded bar', async () => {
    const { fixture, block } = await create();
    fixture.detectChanges();

    expect(block().style.width).toBe('100%');
    expect(block().style.height).toBe('1rem');
    expect(block().className).toContain('rounded');
    expect(block().className).not.toContain('rounded-full');
  });

  it('applies width, height and custom classes', async () => {
    const { fixture, block } = await create();
    fixture.componentRef.setInput('width', '50%');
    fixture.componentRef.setInput('height', '2rem');
    fixture.componentRef.setInput('customClass', 'my-extra');
    fixture.detectChanges();

    expect(block().style.width).toBe('50%');
    expect(block().style.height).toBe('2rem');
    expect(block().className).toContain('my-extra');
  });

  it('renders a circle when requested', async () => {
    const { fixture, block } = await create();
    fixture.componentRef.setInput('circle', true);
    fixture.detectChanges();

    expect(block().className).toContain('rounded-full');
  });
});

describe('SkeletonTableComponent', () => {
  const create = async () => {
    await TestBed.configureTestingModule({
      imports: [SkeletonTableComponent],
      providers: [...provideTestBedDefaults()]
    }).compileComponents();
    const fixture = TestBed.createComponent(SkeletonTableComponent);
    return { fixture, el: fixture.nativeElement as HTMLElement };
  };

  it('renders 5 rows and 5 columns by default', async () => {
    const { fixture, el } = await create();
    fixture.detectChanges();

    expect(el.querySelectorAll('thead th').length).toBe(5);
    expect(el.querySelectorAll('tbody tr').length).toBe(5);
    expect(el.querySelectorAll('tbody td').length).toBe(25);
  });

  it('honours the rows and columns inputs', async () => {
    const { fixture, el } = await create();
    fixture.componentRef.setInput('rows', 3);
    fixture.componentRef.setInput('columns', 2);
    fixture.detectChanges();

    expect(el.querySelectorAll('thead th').length).toBe(2);
    expect(el.querySelectorAll('tbody tr').length).toBe(3);
    expect(el.querySelectorAll('tbody td').length).toBe(6);
  });
});
