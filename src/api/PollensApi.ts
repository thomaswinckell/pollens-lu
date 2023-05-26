import { PollensRates } from '../models/PollensRates';
import pollenInfosJson from '../data/pollens-infos.json';
import metadataJson from '../data/metadata.json';
import { parse } from 'date-fns';
import { DATA_DATE_FORMAT } from '../constants/DataConstants';

// don't load it dynamically, it's not expensive and needed everywhere
export const POLLENS_INFOS = pollenInfosJson as { [pollenId: string]: { allergenic: boolean } };

export const POLLENS_IDS = Object.keys(POLLENS_INFOS);
export const NON_ALLERGENIC_POLLENS_IDS = POLLENS_IDS.filter(id => !POLLENS_INFOS[id].allergenic);
export const ALLERGENIC_POLLENS_IDS = POLLENS_IDS.filter(id => POLLENS_INFOS[id].allergenic);

export const UPDATE_DATE = parse(metadataJson.updateDate, DATA_DATE_FORMAT, new Date());

export const getPollensRateByYear = async (year: number | string): Promise<PollensRates> => await import(`../data/pollens-rates/by-year/${year}.json`);
