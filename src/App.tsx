import { Card, LineChart, Title } from '@tremor/react';
import { uniq } from 'remeda';
import { parse } from 'date-fns';
import pollenRatesJson from './data/pollens-rates/all.json';
import pollenInfosJson from './data/pollens-infos.json';
import { PollensRates } from './models/PollensRates';

const pollensRates = pollenRatesJson as PollensRates;
const pollenInfos = pollenInfosJson as {[pollenId: string]: {allergenic: boolean}};

const year = 2023;

const pollensIds = Object.keys(pollensRates).filter(id => pollenInfos[id].allergenic);
const uniqDates = uniq(pollensIds.flatMap(id => Object.keys(pollensRates[id])));
const yearDates = uniqDates.filter(d => parse(d, 'yyyy-MM-dd', new Date()).getFullYear() === year);

const chartData = yearDates.map(date => ({
  date,
  ...pollensIds.reduce((acc, pollenId) => ({
    ...acc,
    [pollenId]: pollensRates[pollenId][date].rate
  }), {})
}));

const dataFormatter = (number: number) =>
  `${Intl.NumberFormat("us").format(number).toString()}%`;

export function App() {
  return (
    <>
      <Card>
        <Title>Pollens</Title>
        <LineChart
          className="mt-6"
          data={ chartData }
          index="date"
          categories={ pollensIds }
          valueFormatter={ dataFormatter }
          yAxisWidth={ 40 }
        />
      </Card>
    </>
  );
}
