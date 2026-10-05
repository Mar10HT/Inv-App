const TWO_DECIMALS = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Thousands separator and two decimals. */
export const formatNumber = (value: number): string => TWO_DECIMALS.format(value);

/** L for lempiras, $ for every other currency (including the "all currencies" choice of the reports). */
export const currencySymbol = (currency: string | undefined): string => (currency === 'HNL' ? 'L' : '$');

export const formatMoney = (value: number, currency: string | undefined): string =>
  `${currencySymbol(currency)}${formatNumber(value)}`;

/** A money total that may hold more than one currency, keyed by currency code (USD, HNL, ...). */
export type MoneyByCurrency = Record<string, number>;

/** Adds an amount to a money-by-currency total without mutating it. Missing currency defaults to USD. */
export const addMoney = (total: MoneyByCurrency, currency: string | undefined, amount: number): MoneyByCurrency => {
  const key = currency || 'USD';
  return { ...total, [key]: (total[key] || 0) + amount };
};

/**
 * One formatted amount per currency the total holds, joined with " · ". A total mixing
 * currencies (the reports' "all currencies" choice) is never summed into one wrong number.
 */
export const formatMoneyByCurrency = (total: MoneyByCurrency): string => {
  const entries = Object.entries(total);
  if (entries.length === 0) return formatMoney(0, 'USD');
  return entries.map(([currency, amount]) => formatMoney(amount, currency)).join(' · ');
};

/** Sum across currencies, for ranking only (sorting mixed amounts is harmless; showing their sum is not). */
export const totalOf = (total: MoneyByCurrency): number => Object.values(total).reduce((sum, v) => sum + v, 0);
