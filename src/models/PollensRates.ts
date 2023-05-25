import { PollenLevel } from './PollenLevel';

export type PollensRates = {[pollenId: string]: {[date: string]: { rate: number, level: PollenLevel }}};
