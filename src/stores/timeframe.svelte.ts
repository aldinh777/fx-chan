import { load } from "../lib/storage";

export interface TimeFrame {
  label: string;
  days: number;
  interval: string;
}

class TimeFrameStore {
  timeframes: TimeFrame[] = [
    { label: "1D", days: 1, interval: "15m" },
    { label: "7D", days: 7, interval: "1h" },
    { label: "30D", days: 30, interval: "4h" },
    { label: "90D", days: 90, interval: "12h" },
    { label: "360D", days: 360, interval: "1d" },
  ];
  active = $state(load("timeframe", this.timeframes[2]));
}

export const tf = new TimeFrameStore();
