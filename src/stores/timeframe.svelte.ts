import { load } from "../lib/storage";

export interface CryptoTimeframe {
  label: string;
  hours: number;
  interval: string;
}

export interface FxTimeframe {
  label: string;
  days: number;
}

class TimeFrameStore {
  cryptoTimeframes: CryptoTimeframe[] = [
    { label: "1D", hours: 1 * 24, interval: "15m" },
    { label: "7D", hours: 7 * 24, interval: "1h" },
    { label: "1M", hours: 30 * 24, interval: "4h" },
    { label: "3M", hours: 90 * 24, interval: "12h" },
    { label: "6M", hours: 180 * 24, interval: "1d" },
    { label: "1Y", hours: 360 * 24, interval: "3d" },
    { label: "4Y", hours: 4 * 360 * 24, interval: "1w" },
  ];
  fxTimeframes: FxTimeframe[] = [
    { label: "7D", days: 7 },
    { label: "1M", days: 30 },
    { label: "3M", days: 90 },
    { label: "6M", days: 180 },
    { label: "1Y", days: 360 },
    { label: "3Y", days: 360 * 3 },
    { label: "5Y", days: 360 * 5 },
  ];
  activeCrypto = $state(load("tfCrypto", this.cryptoTimeframes[2]));
  activeFx = $state(load("tfFx", this.fxTimeframes[1]));
}

export const tf = new TimeFrameStore();
