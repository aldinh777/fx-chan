import { load } from "../lib/storage";

export interface TimeFrame {
  label: string;
  hours: number;
  interval: string;
}

class TimeFrameStore {
  timeframes: TimeFrame[] = [
    { label: "1D", hours: 1 * 24, interval: "15m" },
    { label: "7D", hours: 7 * 24, interval: "1h" },
    { label: "1M", hours: 30 * 24, interval: "4h" },
    { label: "3M", hours: 90 * 24, interval: "12h" },
    { label: "1Y", hours: 360 * 24, interval: "1d" },
  ];
  active = $state(load("timeframe", this.timeframes[2]));
}

export const tf = new TimeFrameStore();
