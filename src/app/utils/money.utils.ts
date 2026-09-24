const TWO_DECIMALS = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Thousands separator and two decimals. */
export const formatNumber = (value: number): string => TWO_DECIMALS.format(value);

/** L for lempiras, $ for every other currency (including the "all currencies" choice of the reports). */
export const currencySymbol = (currency: string | undefined): string => (currency === 'HNL' ? 'L' : '$');

export const formatMoney = (value: number, currency: string | undefined): string =>
  `${currencySymbol(currency)}${formatNumber(value)}`;
