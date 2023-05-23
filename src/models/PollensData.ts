import { PollenLevel } from './PollenLevel';

export type PollensData = {[pollenId: string]: {[date: string]: { rate: number, level: PollenLevel }}};
