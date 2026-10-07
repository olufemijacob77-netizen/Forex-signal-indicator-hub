/**
 * Utility functions for formatting market data
 */

/**
 * Formats a price based on its magnitude.
 * Forex: 5 decimal places (usually < 10)
 * Crypto/Stocks: 2 decimal places (usually > 10)
 * Very small crypto: up to 8 decimal places
 */
export const formatPrice = (price: any): string => {
  if (price === null || price === undefined || isNaN(price) || typeof price !== 'number') return "---";
  if (price === 0) return "0.00";
  
  const absPrice = Math.abs(price);
  
  if (absPrice >= 1000) {
    return price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  
  if (absPrice >= 10) {
    return price.toFixed(2);
  }
  
  if (absPrice >= 1) {
    return price.toFixed(4);
  }
  
  if (absPrice < 0.0001) {
    return price.toFixed(8);
  }
  
  return price.toFixed(5);
};
