import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CdkDragDrop, CdkDrag, CdkDropList, CdkDragPlaceholder } from '@angular/cdk/drag-drop';
import { LucideAngularModule } from 'lucide-angular';
import { TranslateModule } from '@ngx-translate/core';
import { NgApexchartsModule } from 'ng-apexcharts';
import {
  ApexChart,
  ApexNonAxisChartSeries,
  ApexResponsive,
  ApexLegend,
  ApexDataLabels,
  ApexPlotOptions,
  ApexAxisChartSeries,
  ApexXAxis,
  ApexYAxis,
  ApexGrid,
  ApexTooltip,
  ApexFill
} from 'ng-apexcharts';
import { DashboardStats, CategoryStats, WarehouseStats } from '../../../../services/dashboard.service';

export interface StatusChartOptions {
  chart: ApexChart;
  labels: string[];
  colors: string[];
  legend: ApexLegend;
  dataLabels: ApexDataLabels;
  plotOptions: ApexPlotOptions;
  responsive: ApexResponsive[];
}

export interface BarChartOptions {
  chart: ApexChart;
  xaxis: ApexXAxis;
  yaxis: ApexYAxis;
  colors: string[];
  grid: ApexGrid;
  plotOptions: ApexPlotOptions;
  dataLabels: ApexDataLabels;
  tooltip: ApexTooltip;
  fill?: ApexFill;
}

@Component({
  selector: 'app-dashboard-charts',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    CdkDrag,
    CdkDropList,
    CdkDragPlaceholder,
    LucideAngularModule,
    TranslateModule,
    NgApexchartsModule
  ],
  template: `
    <div
      cdkDropList
      cdkDropListOrientation="horizontal"
      (cdkDropListDropped)="onDrop($event)"
      class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
      @for (widget of widgets(); track widget) {
        <div cdkDrag class="bg-surface-variant rounded-xl border border-theme p-6 cursor-move hover:border-[#3a3a3a] transition-colors">
          <!-- Drag Handle -->
          <div cdkDragHandle class="flex items-center justify-between mb-4">
            @if (widget === 'status') {
              <h3 class="text-lg font-semibold text-foreground">{{ 'COMMON.STATUS' | translate }}</h3>
              <lucide-icon name="PieChart" class="!w-4 !h-4 text-slate-600"></lucide-icon>
            } @else if (widget === 'categories') {
              <h3 class="text-lg font-semibold text-foreground">{{ 'NAV.CATEGORIES' | translate }}</h3>
              <lucide-icon name="FolderOpen" class="!w-4 !h-4 text-slate-600"></lucide-icon>
            } @else if (widget === 'warehouses') {
              <h3 class="text-lg font-semibold text-foreground">{{ 'NAV.WAREHOUSES' | translate }}</h3>
              <lucide-icon name="Warehouse" class="!w-4 !h-4 text-slate-600"></lucide-icon>
            }
          </div>

          <!-- Widget Content -->
          @if (widget === 'status') {
            @if (stats()?.totalItems && statusChartOptions()) {
              <apx-chart
                [series]="statusChartSeries()"
                [chart]="statusChartOptions()!.chart"
                [labels]="statusChartOptions()!.labels"
                [colors]="statusChartOptions()!.colors"
                [legend]="statusChartOptions()!.legend"
                [dataLabels]="statusChartOptions()!.dataLabels"
                [plotOptions]="statusChartOptions()!.plotOptions"
                [responsive]="statusChartOptions()!.responsive">
              </apx-chart>
            } @else {
              <div class="flex flex-col items-center justify-center py-12">
                <lucide-icon name="PieChart" class="!w-8 !h-8 text-slate-700 mb-2"></lucide-icon>
                <p class="text-slate-500 text-sm">{{ 'COMMON.NO_DATA' | translate }}</p>
              </div>
            }
          } @else if (widget === 'categories') {
            @if (categoryStats().length > 0 && categoryChartOptions()) {
              <apx-chart
                [series]="categoryChartSeries()"
                [chart]="categoryChartOptions()!.chart"
                [xaxis]="categoryChartOptions()!.xaxis"
                [yaxis]="categoryChartOptions()!.yaxis"
                [colors]="categoryChartOptions()!.colors"
                [grid]="categoryChartOptions()!.grid"
                [plotOptions]="categoryChartOptions()!.plotOptions"
                [dataLabels]="categoryChartOptions()!.dataLabels"
                [tooltip]="categoryChartOptions()!.tooltip">
              </apx-chart>
            } @else {
              <div class="flex flex-col items-center justify-center py-12">
                <lucide-icon name="BarChart2" class="!w-8 !h-8 text-slate-700 mb-2"></lucide-icon>
                <p class="text-slate-500 text-sm">{{ 'COMMON.NO_DATA' | translate }}</p>
              </div>
            }
          } @else if (widget === 'warehouses') {
            @if (warehouseStats().length > 0 && warehouseChartOptions()) {
              <apx-chart
                [series]="warehouseChartSeries()"
                [chart]="warehouseChartOptions()!.chart"
                [xaxis]="warehouseChartOptions()!.xaxis"
                [yaxis]="warehouseChartOptions()!.yaxis"
                [colors]="warehouseChartOptions()!.colors"
                [grid]="warehouseChartOptions()!.grid"
                [plotOptions]="warehouseChartOptions()!.plotOptions"
                [dataLabels]="warehouseChartOptions()!.dataLabels"
                [tooltip]="warehouseChartOptions()!.tooltip"
                [fill]="warehouseChartOptions()?.fill!">
              </apx-chart>
            } @else {
              <div class="flex flex-col items-center justify-center py-12">
                <lucide-icon name="BarChart2" class="!w-8 !h-8 text-slate-700 mb-2"></lucide-icon>
                <p class="text-slate-500 text-sm">{{ 'COMMON.NO_DATA' | translate }}</p>
              </div>
            }
          }

          <!-- Drag Placeholder -->
          <div *cdkDragPlaceholder class="bg-[#2a2a2a] rounded-xl border-2 border-dashed border-[#4d7c6f] h-full min-h-[320px]"></div>
        </div>
      }
    </div>
  `
})
export class DashboardChartsComponent {
  widgets = input<string[]>([]);
  stats = input<DashboardStats | null>(null);
  categoryStats = input<CategoryStats[]>([]);
  warehouseStats = input<WarehouseStats[]>([]);

  statusChartSeries = input<ApexNonAxisChartSeries>([]);
  statusChartOptions = input<StatusChartOptions | null>(null);

  categoryChartSeries = input<ApexAxisChartSeries>([]);
  categoryChartOptions = input<BarChartOptions | null>(null);

  warehouseChartSeries = input<ApexAxisChartSeries>([]);
  warehouseChartOptions = input<BarChartOptions | null>(null);

  widgetDrop = output<CdkDragDrop<string[]>>();

  onDrop(event: CdkDragDrop<string[]>): void {
    this.widgetDrop.emit(event);
  }
}
