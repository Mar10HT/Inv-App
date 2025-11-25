import { Component, OnInit, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatRadioModule } from '@angular/material/radio';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { InventoryService } from '../../services/inventory/inventory.service';
import { WarehouseService } from '../../services/warehouse.service';
import { SupplierService } from '../../services/supplier.service';
import { UserService } from '../../services/user.service';
import { ItemType, Currency, CreateInventoryItemDto } from '../../interfaces/inventory-item.interface';
import { Warehouse } from '../../interfaces/warehouse.interface';
import { Supplier } from '../../interfaces/supplier.interface';
import { User, UserRole } from '../../interfaces/user.interface';

@Component({
  selector: 'app-inventory-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatRadioModule,
    MatDividerModule,
    MatProgressSpinnerModule,
    TranslateModule
  ],
  templateUrl: './inventory-form.component.html',
  styleUrl: './inventory-form.component.css'
})
export class InventoryFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private inventoryService = inject(InventoryService);
  private warehouseService = inject(WarehouseService);
  private supplierService = inject(SupplierService);
  private userService = inject(UserService);
  private translate = inject(TranslateService);

  // Enums for template
  ItemType = ItemType;
  Currency = Currency;
  UserRole = UserRole;

  // Form
  inventoryForm!: FormGroup;

  // Data signals
  warehouses = this.warehouseService.warehouses;
  suppliers = this.supplierService.suppliers;
  users = this.userService.users;

  // Loading states
  loading = signal<boolean>(false);
  warehousesLoading = this.warehouseService.loading;
  suppliersLoading = this.supplierService.loading;
  usersLoading = this.userService.loading;

  // Computed signals
  isUniqueItem = computed(() => this.itemTypeControl?.value === ItemType.UNIQUE);
  isBulkItem = computed(() => this.itemTypeControl?.value === ItemType.BULK);

  assignableUsers = computed(() =>
    this.users().filter(user =>
      user.role === UserRole.USER || user.role === UserRole.EXTERNAL
    )
  );

  // Form controls shortcuts
  get itemTypeControl() {
    return this.inventoryForm?.get('itemType');
  }

  get warehouseIdControl() {
    return this.inventoryForm?.get('warehouseId');
  }

  get currencyControl() {
    return this.inventoryForm?.get('currency');
  }

  constructor() {
    // Effect to handle dynamic validations when itemType changes
    effect(() => {
      const isUnique = this.isUniqueItem();

      if (this.inventoryForm) {
        const serviceTagControl = this.inventoryForm.get('serviceTag');
        const serialNumberControl = this.inventoryForm.get('serialNumber');
        const skuControl = this.inventoryForm.get('sku');
        const barcodeControl = this.inventoryForm.get('barcode');
        const quantityControl = this.inventoryForm.get('quantity');
        const minQuantityControl = this.inventoryForm.get('minQuantity');

        if (isUnique) {
          // UNIQUE items: require serviceTag OR serialNumber, make quantity read-only (1)
          serviceTagControl?.setValidators([Validators.required]);
          serialNumberControl?.clearValidators();
          skuControl?.clearValidators();
          barcodeControl?.clearValidators();

          // Set quantity to 1 and make it read-only
          quantityControl?.setValue(1);
          quantityControl?.disable();
          minQuantityControl?.setValue(1);
          minQuantityControl?.disable();
        } else {
          // BULK items: require SKU AND barcode, enable quantity
          serviceTagControl?.clearValidators();
          serialNumberControl?.clearValidators();
          skuControl?.setValidators([Validators.required]);
          barcodeControl?.setValidators([Validators.required]);

          // Enable quantity editing
          quantityControl?.enable();
          quantityControl?.setValidators([Validators.required, Validators.min(0)]);
          minQuantityControl?.enable();
          minQuantityControl?.setValidators([Validators.required, Validators.min(0)]);
        }

        // Update validity
        serviceTagControl?.updateValueAndValidity();
        serialNumberControl?.updateValueAndValidity();
        skuControl?.updateValueAndValidity();
        barcodeControl?.updateValueAndValidity();
        quantityControl?.updateValueAndValidity();
        minQuantityControl?.updateValueAndValidity();
      }
    });
  }

  ngOnInit(): void {
    this.initializeForm();
    this.loadData();
  }

  private initializeForm(): void {
    this.inventoryForm = this.fb.group({
      // Basic info
      name: ['', [Validators.required, Validators.minLength(3)]],
      description: ['', [Validators.required, Validators.minLength(10)]],
      category: ['', Validators.required],
      location: ['', Validators.required],

      // Item type (UNIQUE vs BULK)
      itemType: [ItemType.BULK, Validators.required],

      // Identifiers (dynamic validation)
      serviceTag: [''],
      serialNumber: [''],
      sku: ['', Validators.required],
      barcode: ['', Validators.required],

      // Quantity (dynamic based on type)
      quantity: [0, [Validators.required, Validators.min(0)]],
      minQuantity: [0, [Validators.required, Validators.min(0)]],

      // Price
      price: [0, [Validators.required, Validators.min(0)]],
      currency: [Currency.HNL, Validators.required],

      // Relations
      warehouseId: ['', Validators.required],
      supplierId: [''],

      // Assignment (only for UNIQUE items)
      assignedToUserId: ['']
    });

    // Trigger initial validation setup
    this.itemTypeControl?.setValue(ItemType.BULK);
  }

  private loadData(): void {
    // Load warehouses
    this.warehouseService.getAll().subscribe({
      error: (error) => console.error('Error loading warehouses:', error)
    });

    // Load suppliers
    this.supplierService.getAll().subscribe({
      error: (error) => console.error('Error loading suppliers:', error)
    });

    // Load users
    this.userService.getAll().subscribe({
      error: (error) => console.error('Error loading users:', error)
    });
  }

  onItemTypeChange(type: ItemType): void {
    // Clear fields when switching type
    if (type === ItemType.UNIQUE) {
      this.inventoryForm.patchValue({
        sku: '',
        barcode: '',
        quantity: 1,
        minQuantity: 1,
        assignedToUserId: ''
      });
    } else {
      this.inventoryForm.patchValue({
        serviceTag: '',
        serialNumber: '',
        assignedToUserId: ''
      });
    }
  }

  onSubmit(): void {
    if (this.inventoryForm.invalid) {
      this.inventoryForm.markAllAsTouched();
      return;
    }

    this.loading.set(true);

    // Get form values
    const formValue = this.inventoryForm.getRawValue();

    // Build DTO based on item type
    const dto: CreateInventoryItemDto = {
      name: formValue.name,
      description: formValue.description,
      category: formValue.category,
      location: formValue.location,
      itemType: formValue.itemType,
      quantity: formValue.itemType === ItemType.UNIQUE ? 1 : formValue.quantity,
      minQuantity: formValue.itemType === ItemType.UNIQUE ? 1 : formValue.minQuantity,
      price: formValue.price,
      currency: formValue.currency,
      warehouseId: formValue.warehouseId,
      status: this.calculateStatus(formValue.quantity, formValue.minQuantity)
    };

    // Add optional fields based on item type
    if (formValue.itemType === ItemType.UNIQUE) {
      if (formValue.serviceTag) dto.serviceTag = formValue.serviceTag;
      if (formValue.serialNumber) dto.serialNumber = formValue.serialNumber;
      if (formValue.assignedToUserId) dto.assignedToUserId = formValue.assignedToUserId;
    } else {
      dto.sku = formValue.sku;
      dto.barcode = formValue.barcode;
    }

    // Add supplier if selected
    if (formValue.supplierId) {
      dto.supplierId = formValue.supplierId;
    }

    // Create item
    this.inventoryService.createItem(dto).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(['/inventory']);
      },
      error: (error) => {
        console.error('Error creating item:', error);
        this.loading.set(false);
      }
    });
  }

  private calculateStatus(quantity: number, minQuantity: number): 'in-stock' | 'low-stock' | 'out-of-stock' {
    if (quantity === 0) return 'out-of-stock';
    if (quantity <= minQuantity) return 'low-stock';
    return 'in-stock';
  }

  onCancel(): void {
    this.router.navigate(['/inventory']);
  }

  // Helper methods for template
  getErrorMessage(controlName: string): string {
    const control = this.inventoryForm.get(controlName);

    if (control?.hasError('required')) {
      return this.translate.instant('FORM.VALIDATION.REQUIRED');
    }

    if (control?.hasError('minlength')) {
      const minLength = control.errors?.['minlength'].requiredLength;
      return this.translate.instant('FORM.VALIDATION.MIN_LENGTH', { length: minLength });
    }

    if (control?.hasError('min')) {
      return this.translate.instant('FORM.VALIDATION.MIN_VALUE', { value: 0 });
    }

    return '';
  }

  hasError(controlName: string): boolean {
    const control = this.inventoryForm.get(controlName);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }
}
