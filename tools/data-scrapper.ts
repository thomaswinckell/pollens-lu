import fetch from 'node-fetch-retry';
import { parse, isValid, isBefore, getWeek, addWeeks, subWeeks, getWeekYear, startOfWeek } from 'date-fns';
import { JSDOM } from 'jsdom';
import { PollenLevel } from '../src/models/PollenLevel';
import { PollensData } from '../src/models/PollensData';
import * as fs from 'fs';

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

const extractPollensTranslations = (document: Document): { [latinId: string]: { [k in 'FR' | 'LU' | 'DE']: string } } => {
  const res = {};
  document.querySelectorAll(`${CONTENT_SELECTOR} table tr`).forEach((trElement, index) => {
    // ignore first line
    if (index === 0) {
      return;
    }
    const trSelector = `${CONTENT_SELECTOR} table tr:nth-of-type(${index + 1})`;
    const latinId = document.querySelector(`${trSelector} td:nth-of-type(2)`).textContent.toLowerCase();
    res[latinId] = {
      FR: document.querySelector(`${trSelector} td:nth-of-type(1)`).textContent,
      DE: document.querySelector(`${trSelector} td:nth-of-type(3)`).textContent,
      LU: document.querySelector(`${trSelector} td:nth-of-type(4)`).textContent,
    };
  });
  return res;
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

const extractPollensData = (document: Document, data: PollensData): void => {
  const firstLineTrSelector = `${CONTENT_SELECTOR} table tr:nth-of-type(${1})`;
  const dates: string[] = [];
  // get dates
  document.querySelectorAll(`${firstLineTrSelector} td`).forEach((tdElement, index) => {
    // ignore first lines
    if (index < 4) {
      return;
    }
    dates.push(document.querySelector(`${firstLineTrSelector} td:nth-child(${index + 1})`).textContent);
  });
  // get rates and level
  document.querySelectorAll(`${CONTENT_SELECTOR} table tr`).forEach((trElement, lineIndex) => {
    // ignore first line
    if (lineIndex < 1) {
      return;
    }
    const trSelector = `${CONTENT_SELECTOR} table tr:nth-of-type(${lineIndex + 1})`;
    const latinId = document.querySelector(`${trSelector} td:nth-child(2)`).textContent.toLowerCase();
    if (!data[latinId]) {
      data[latinId] = {};
    }
    dates.forEach((date, dateIndex) => {
      const tdSelector = `${trSelector} td:nth-child(${dateIndex + 5})`;
      const rate = parseFloat(document.querySelector(tdSelector).textContent);
      data[latinId][date] = {
        rate,
        level: getPollenLevelFromColor(rate, document.querySelector(`${tdSelector} font`)?.attributes['color']?.value),
      };
    });
  });
};

(async () => {

  try {
    console.log('Starting scrapping...');

    const scrapLatestDataOnly = process.argv.slice(2)[0] === '--latest'; // scrap 5 latest weeks only
    const jsonFilePath = './src/data/pollens-rates.json';
    const sleepTimeBetweenFetch = 500;

    const startDate = scrapLatestDataOnly ? subWeeks(new Date(), 5) : new Date(1991, 0); // there's no data before 1991
    let endDate: Date | undefined;
    let currentDate = startDate;

    const data: PollensData = scrapLatestDataOnly ? JSON.parse(fs.readFileSync(jsonFilePath, 'utf-8')) : {};
    let previousWeek = -1;

    while (!endDate || isBefore(currentDate, endDate)) {
      console.log(currentDate.toDateString());
      // they count weeks differently in pollen.lu
      const year = currentDate.getFullYear();
      let week = getWeek(currentDate) - 1;
      if (year !== getWeekYear(currentDate)) {
        week = previousWeek + 1;
      }

      console.log(`Getting data for year ${year} / week ${week}`);

      const url = getPageUrl(year, week);
      const res = await fetch(url, { method: 'GET', retry: 3, pause: 5000 });
      const html = await res.text();
      const { document } = new JSDOM(html).window;

      endDate = extractUpdateDate(document);

      extractPollensData(document, data);

      if (year === getWeekYear(currentDate)) {
        currentDate = startOfWeek(addWeeks(currentDate, 1));
      } else {
        currentDate = new Date(getWeekYear(currentDate), 0);
      }
      previousWeek = week;

      await sleep(sleepTimeBetweenFetch);
    }

    console.log('Scrapping done. Writing JSON file...');

    fs.writeFileSync(jsonFilePath, JSON.stringify(data, null, 2));

  } catch (e) {
    console.log(e);
  }
})();
