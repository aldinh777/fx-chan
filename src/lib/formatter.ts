export function formatPrice(val: number | undefined) {
  if (val === undefined) return "0.00";
  if (val < 0.01) return val.toFixed(6);
  if (val < 1) return val.toFixed(4);
  if (val < 10) return val.toFixed(3);
  if (val < 1000) return val.toFixed(2);
  if (val < 10000) return val.toFixed(1);
  if (val > 10000) return val.toFixed(0);
  return val.toFixed(2);
}

export function formatBalance(val: number) {
  return val.toFixed(2);
}
