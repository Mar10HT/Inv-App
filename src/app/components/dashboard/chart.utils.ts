import { currencySymbol, formatNumber } from '../../utils/money.utils';

// Helpers shared by the dashboard charts and the custom chart dialog preview.

const PIE_CHART_TYPES = ['pie', 'donut', 'radialBar'];
const VALUE_SOURCES = ['valueByCategory', 'valueByWarehouse', 'valueBySupplier', 'valueByStatus', 'topItemsByValue'];

// Series palette for circle charts, muted to match the design system. The chosen color leads.
const CHART_PALETTE = ['#4d7c6f', '#6b7bb5', '#c8884d', '#a78bfa', '#2dd4bf', '#b85c5c'] as const;

export const isPieChartType = (chartType: string): boolean => PIE_CHART_TYPES.includes(chartType);

/** A value source adds up money (price times quantity), the others count items. */
export const isValueSource = (source: string): boolean => VALUE_SOURCES.includes(source);

/** Formats the values of an axis or a tooltip: money for a value chart, a plain count otherwise. */
export function chartValueFormatter(isValueChart: boolean, currency: string | undefined): (value: number) => string {
  const symbol = currencySymbol(currency);
  return (value) => (isValueChart ? `${symbol}${formatNumber(value)}` : value.toLocaleString('en-US'));
}

export function seriesName(source: string, currency: string | undefined): string {
  return isValueSource(source) ? `Value (${currencySymbol(currency)})` : 'Items';
}

/** The colors of a chart: a palette for a circle chart, the chosen color alone for the others. */
export function chartColors(color: string, chartType: string): string[] {
  if (!isPieChartType(chartType)) return [color];
  return [color, ...CHART_PALETTE.filter((c) => c !== color)].slice(0, 6);
}

/** ApexCharts needs resolved colors, so a CSS variable is read from the page. */
export function cssVar(name: string, fallback: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}
