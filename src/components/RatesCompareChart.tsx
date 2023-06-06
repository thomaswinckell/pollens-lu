import { Card, Dropdown, DropdownItem, LineChart, Title } from '@tremor/react';
import { range, uniq } from 'remeda';
import { useState, useEffect, FC } from 'react';
import { parse, format } from 'date-fns';
import { DATA_DATE_FORMAT, DATA_MIN_YEAR } from '../constants/DataConstants';
import {
  getPollensRateByYear, POLLENS_IDS,
} from '../api/PollensApi';
import { Spin } from './Spin';
import { PollensRates } from '../models/PollensRates';
import { FormattedMessage, useIntl } from 'react-intl';
import { IntlShape } from 'react-intl/src/types';

type RatesCompareChartData = { day: string; [year: number]: string }[];

const NOW = new Date();
const CURRENT_YEAR = NOW.getFullYear();

const computeChartData = async (years: [number, number], pollenId: string, intl: IntlShape): Promise<RatesCompareChartData> => {

  const dateFormatter = new Intl.DateTimeFormat(intl.locale, { month: 'short', day: 'numeric' });

  const rawData: PollensRates[] = await Promise.all(years.map(getPollensRateByYear));

  const daysList = uniq(
    rawData.flatMap(d =>
      Object.keys(d[pollenId]).map(date => format(parse(date, DATA_DATE_FORMAT, new Date()), 'MM-dd')),
    ),
  );

  return daysList.sort().map(day => ({
    day: dateFormatter.format(parse(day, 'MM-dd', new Date())),
    ...years.reduce((acc, year, yearIndex) => ({
      ...acc,
      [year]: rawData[yearIndex][pollenId][`${year}-${day}`]?.rate,
    }), {}),
  }));
};

export interface RatesCompareChartProps {
  currentPollenType: string;
  setCurrentPollenType: (pollenId: string) => void;
}

export const RatesCompareChart: FC<RatesCompareChartProps> = ({ currentPollenType, setCurrentPollenType }) => {
  const intl = useIntl();
  const [loading, setLoading] = useState<boolean>(true);
  const [years, setYears] = useState<[number, number]>([CURRENT_YEAR - 1, CURRENT_YEAR]);
  const [chartData, setChartData] = useState<RatesCompareChartData>([]);

  useEffect(() => {
    setLoading(true);
    (async () => {
      const chartData = await computeChartData(years, currentPollenType, intl);
      setChartData(chartData);
      setLoading(false);
    })();
  }, [years, currentPollenType, intl.locale]);

  const intlCollator = new Intl.Collator(intl.locale);
  const pollens: [string, string][] = POLLENS_IDS
    .map(id => ([id, intl.formatMessage({ id: `pollen.${id}` })]))
    .sort(([, a], [, b]) => intlCollator.compare(a, b)) as [string, string][];

  const yearsRange = range(DATA_MIN_YEAR, CURRENT_YEAR + 1).reverse();

  return (
    <Card>
      <div className='flex flex-col md:flex-row'>
        <Title><FormattedMessage id='compare-rates-chart.title' /></Title>
        <Dropdown
          className='min-w-[6rem] max-w-[6rem] mt-2 mb-2 md:mb-0 md:ml-2 md:mr-2 md:-mt-1'
          onValueChange={(value) => setYears([parseInt(value), years[1]])}
          value={years[0].toString()}
        >
          {yearsRange.map(year => (
            <DropdownItem value={year.toString()} text={year.toString()} key={year} />
          ))}
        </Dropdown>
        <Title><FormattedMessage id='compare-rates-chart.and-year' /></Title>
        <Dropdown
          className='min-w-[6rem] max-w-[6rem] mt-2 mb-2 md:mb-0 md:ml-2 md:mr-2 md:-mt-1'
          onValueChange={(value) => setYears([years[0], parseInt(value)])}
          value={years[1].toString()}
        >
          {yearsRange.map(year => (
            <DropdownItem value={year.toString()} text={year.toString()} key={year} />
          ))}
        </Dropdown>
        <Title><FormattedMessage id='compare-rates-chart.for' /></Title>
        <Dropdown
          className='max-w-[10rem] mt-2 md:ml-2 md:mr-2 md:-mt-1'
          onValueChange={(value) => setCurrentPollenType(value)}
          value={currentPollenType}
        >
          {pollens.map(([id, name]) => (
            <DropdownItem value={id} text={name} key={id} />
          ))}
        </Dropdown>
      </div>
      {loading ? (
        <div className='flex h-80'>
          <Spin />
        </div>
      ) : (
        <LineChart
          className='mt-6'
          data={chartData}
          index='day'
          categories={years.map(y => y.toString())}
          yAxisWidth={40}
          showAnimation={false}
        />
      )}
    </Card>
  );
};
