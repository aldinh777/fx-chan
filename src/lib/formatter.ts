export function formatTinyPrice(val: number) {
  const negative = val < 0;
  const abs = Math.abs(val);
  const str = abs.toFixed(10);
  const [, decimals] = str.split(".");
  const match = decimals.match(/^0+/);
  const zeroCount = match?.[0].length || 0;

  if (zeroCount >= 3) {
    const remaining = decimals.slice(zeroCount, zeroCount + 3);

    return `${negative ? "-" : ""}0.0{${zeroCount}}${remaining}`;
  }

  return `${negative ? "-" : ""}${str}`;
}
export function formatPrice(val: number | undefined) {
  if (val === undefined) return "0.00";

  const abs = Math.abs(val);

  if (abs < 0.000001) return formatTinyPrice(val);
  if (abs < 0.0001) return formatTinyPrice(val);

  if (abs < 0.01) return val.toFixed(6);
  if (abs < 1) return val.toFixed(4);
  if (abs < 10) return val.toFixed(3);
  if (abs < 1000) return val.toFixed(2);
  if (abs < 10000) return val.toFixed(1);

  return val.toFixed(0);
}

export function formatBalance(val: number) {
  return val.toFixed(2);
}

export function getPriceFormat(price: number) {
  if (price < 0.000001) {
    return {
      precision: 10,
      minMove: 0.0000000001,
    };
  }

  if (price < 0.0001) {
    return {
      precision: 8,
      minMove: 0.00000001,
    };
  }

  if (price < 0.01) {
    return {
      precision: 6,
      minMove: 0.000001,
    };
  }

  if (price < 1) {
    return {
      precision: 4,
      minMove: 0.0001,
    };
  }

  if (price < 10) {
    return {
      precision: 3,
      minMove: 0.001,
    };
  }

  if (price < 1000) {
    return {
      precision: 2,
      minMove: 0.01,
    };
  }

  if (price < 10000) {
    return {
      precision: 1,
      minMove: 0.1,
    };
  }

  return {
    precision: 0,
    minMove: 1,
  };
}
