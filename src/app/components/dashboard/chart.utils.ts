// Helpers shared by the dashboard charts and the custom chart dialog preview.

const PIE_CHART_TYPES = ['pie', 'donut', 'radialBar'];
const VALUE_SOURCES = ['valueByCategory', 'valueByWarehouse', 'valueBySupplier', 'valueByStatus', 'topItemsByValue'];

// Complementary palettes for the charts drawn as a circle, keyed by the chart's base color
export const CHART_PALETTES: Record<string, string[]> = {
  '#4d7c6f': ['#4d7c6f', '#f97316', '#8b5cf6', '#06b6d4', '#ec4899', '#eab308'],
  '#10b981': ['#10b981', '#ef4444', '#8b5cf6', '#f97316', '#3b82f6', '#ec4899'],
  '#06b6d4': ['#06b6d4', '#f97316', '#10b981', '#ec4899', '#eab308', '#8b5cf6'],
  '#3b82f6': ['#3b82f6', '#f97316', '#10b981', '#ec4899', '#eab308', '#06b6d4'],
  '#8b5cf6': ['#8b5cf6', '#10b981', '#f97316', '#06b6d4', '#ef4444', '#eab308'],
  '#ec4899': ['#ec4899', '#10b981', '#3b82f6', '#f97316', '#06b6d4', '#8b5cf6'],
  '#f97316': ['#f97316', '#3b82f6', '#10b981', '#8b5cf6', '#06b6d4', '#ec4899'],
  '#eab308': ['#eab308', '#8b5cf6', '#3b82f6', '#ec4899', '#06b6d4', '#10b981'],
  '#ef4444': ['#ef4444', '#10b981', '#3b82f6', '#eab308', '#8b5cf6', '#06b6d4'],
  '#64748b': ['#64748b', '#f97316', '#10b981', '#8b5cf6', '#ec4899', '#3b82f6']
};

export const isPieChartType = (chartType: string): boolean => PIE_CHART_TYPES.includes(chartType);

/** A value source adds up money (price times quantity), the others count items. */
export const isValueSource = (source: string): boolean => VALUE_SOURCES.includes(source);

export const currencySymbol = (currency: string | undefined): string => (currency === 'HNL' ? 'L' : '$');

/** Thousands separator and two decimals. */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
}

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
  return isPieChartType(chartType) ? CHART_PALETTES[color] || [color] : [color];
}

/** ApexCharts needs resolved colors, so a CSS variable is read from the page. */
export function cssVar(name: string, fallback: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}
