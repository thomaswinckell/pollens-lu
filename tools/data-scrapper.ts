import fetch from 'node-fetch-retry';
import {
  parse,
  isValid,
  isBefore,
  getWeek,
  addWeeks,
  subWeeks,
  getWeekYear,
  startOfWeek,
  addDays, isSameWeek, startOfYear, format, isAfter, startOfDay,
} from 'date-fns';
import { JSDOM } from 'jsdom';
import { PollenLevel } from '../src/models/PollenLevel';
import { PollensRates } from '../src/models/PollensRates';
import * as fs from 'fs';
import { DATA_DATE_FORMAT, DATA_MIN_YEAR } from '../src/constants/DataConstants';

const getPageUrl = (year: number, week: number) => `http://www.pollen.lu/index.php?qsPage=data&year=${year}&week=${week}`;

const CONTENT_SELECTOR = 'table.main table div.content';

const sleep = (time: number) => new Promise(resolve => setTimeout(resolve, time));

const extractUpdateDate = (document: Document): Date => {
  const updateDateText = document.querySelector(`${CONTENT_SELECTOR} p`)?.textContent || '';
  const matchRes = updateDateText.match(new RegExp('\\(\\s?Actualisation\\s?:\\s?(.*)\\s?\\)'));
  if (!matchRes) {
    throw new Error(`Cannot find update date in text : ${updateDateText}`);
  }
  const date = parse(matchRes[1].trim(), 'dd.MM.yyyy', new Date());
  if (!isValid(date)) {
    throw new Error(`Cannot parse date : ${matchRes[1].trim()}`);
  }
  return date;
};

const getPollenLevelFromColor = (rate: number, color?: string): PollenLevel => {
  if (color === 'red') {
    return rate === 0 ? PollenLevel.LOW : PollenLevel.SEVERE;
  }
  if (color === 'orange') {
    return rate === 0 ? PollenLevel.LOW : PollenLevel.MODERATE;
  }
  if (color === 'green') {
    return PollenLevel.LOW;
  }
  return PollenLevel.NON_ALLERGENIC;
};

const extractPollensData = (document: Document, data: PollensRates, endDate: Date): void => {
  const firstLineTrSelector = `${CONTENT_SELECTOR} table tr:nth-of-type(${1})`;
  const dates: string[] = [];
  // get dates
  document.querySelectorAll(`${firstLineTrSelector} td`).forEach((_, index) => {
    // ignore first lines
    if (index < 4) {
      return;
    }
    dates.push(document.querySelector(`${firstLineTrSelector} td:nth-child(${index + 1})`)!.textContent!);
  });
  // get rates and level
  document.querySelectorAll(`${CONTENT_SELECTOR} table tr`).forEach((_, lineIndex) => {
    // ignore first line
    if (lineIndex < 1) {
      return;
    }
    const trSelector = `${CONTENT_SELECTOR} table tr:nth-of-type(${lineIndex + 1})`;
    const latinId = document.querySelector(`${trSelector} td:nth-child(2)`)!.textContent!.toLowerCase();
    if (!data[latinId]) {
      data[latinId] = {};
    }
    dates
      .filter(date => !isAfter(startOfDay(parse(date, DATA_DATE_FORMAT, new Date())), startOfDay(endDate)))
      .forEach((date, dateIndex) => {
        const tdSelector = `${trSelector} td:nth-child(${dateIndex + 5})`;
        const rate = parseFloat(document.querySelector(tdSelector)!.textContent!);
        data[latinId][date] = {
          rate,
          level: getPollenLevelFromColor(rate, document.querySelector(`${tdSelector} font`)?.attributes['color' as any]?.value),
        };
      });
  });
};

(async () => {

  try {
    console.log('Starting scrapping...');

    const scrapLatestDataOnly = process.argv.slice(2)[0] === '--latest'; // scrap 5 latest weeks only
    const allRatesJsonFilePath = './src/data/pollens-rates/all.json';
    const sleepTimeBetweenFetch = 500;

    const startDate = scrapLatestDataOnly ? startOfWeek(subWeeks(new Date(), 5)) : new Date(DATA_MIN_YEAR, 0);
    let endDate: Date | undefined;
    let currentDate = startDate;

    const data: PollensRates = scrapLatestDataOnly ? JSON.parse(fs.readFileSync(allRatesJsonFilePath, 'utf-8')) : {};
    let previousWeek = -1;
    let yearWeekStartIndex = 0;

    while (!endDate || isBefore(currentDate, endDate)) {

      const year = currentDate.getFullYear();

      // they count weeks differently in pollen.lu
      // if the first day of the year if also the first day of a full week, we start at index 1
      const firstDayOfYear = startOfYear(currentDate);
      if (isSameWeek(firstDayOfYear, addDays(firstDayOfYear, 6))) {
        yearWeekStartIndex = 1;
      } else {
        yearWeekStartIndex = 0;
      }
      let week = getWeek(currentDate) - 1 + yearWeekStartIndex;
      if (year !== getWeekYear(currentDate)) {
        week = previousWeek + 1;
      }

      console.log(`Getting data for year ${year} / week ${week}`);

      const url = getPageUrl(year, week);
      const res = await fetch(url, { method: 'GET', retry: 3, pause: 5000 });
      const html = await res.text();
      const { document } = new JSDOM(html).window;

      endDate = extractUpdateDate(document);

      extractPollensData(document, data, endDate);

      if (year === getWeekYear(currentDate)) {
        currentDate = startOfWeek(addWeeks(currentDate, 1));
      } else {
        currentDate = new Date(getWeekYear(currentDate), 0);
      }
      previousWeek = week;

      await sleep(sleepTimeBetweenFetch);
    }

    console.log('Scrapping done. Writing JSON files...');

    fs.writeFileSync(allRatesJsonFilePath, JSON.stringify(data, null, 0));

    const dataPerYear: { [year: string]: PollensRates } = {};

    Object.keys(data).forEach(pollenId => {
      Object.keys(data[pollenId]).forEach(date => {
        const year = parse(date, DATA_DATE_FORMAT, new Date()).getFullYear();
        if (!dataPerYear[year]) {
          dataPerYear[year] = {};
        }
        if (!dataPerYear[year][pollenId]) {
          dataPerYear[year][pollenId] = {};
        }
        dataPerYear[year][pollenId][date] = data[pollenId][date];
      });
    });

    Object.keys(dataPerYear).forEach(year => {
      fs.writeFileSync(`./src/data/pollens-rates/by-year/${year}.json`, JSON.stringify(dataPerYear[year], null, 0));
    });

    if (endDate) {
      fs.writeFileSync(`./src/data/metadata.json`, JSON.stringify({ updateDate: format(endDate, DATA_DATE_FORMAT) }, null, 0));
    }

  } catch (e) {
    console.log(e);
  }
})();
