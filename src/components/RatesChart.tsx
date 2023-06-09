import { Card, Color, Dropdown, DropdownItem, LineChart, Title } from '@tremor/react';
import { range, uniq } from 'remeda';
import { useState, useEffect, FC } from 'react';
import { isAfter, parse, subDays, startOfYear } from 'date-fns';
import { DATA_DATE_FORMAT, DATA_MIN_YEAR } from '../constants/DataConstants';
import {
  ALLERGENIC_POLLENS_IDS,
  getPollensRateByYear,
  NON_ALLERGENIC_POLLENS_IDS,
  POLLENS_IDS,
} from '../api/PollensApi';
import { Spin } from './Spin';
import { PollensRates } from '../models/PollensRates';
import { FormattedMessage, useIntl } from 'react-intl';
import { IntlShape } from 'react-intl/src/types';
import { PollenType } from '../models/PollenType';

type RatesChartData = {
  data: { date: string; [pollenId: string]: string }[];
  categories: string[];
};

const NOW = new Date();
const CURRENT_YEAR = NOW.getFullYear();

const CHART_COLORS: Color[] = [
  'red', 'orange', 'amber', 'yellow', 'lime', 'green', 'emerald', 'teal', 'cyan', 'sky', 'blue',
  'indigo', 'violet', 'purple', 'fuchsia', 'pink', 'rose', 'stone', 'slate', 'gray', 'zinc', 'neutral'
];

enum Period {
  LAST_10_DAYS = -10,
  LAST_30_DAYS = -30,
  LAST_60_DAYS = -60,
  LAST_90_DAYS = -90,
}

export const getPollensListFromPollenType = (pollen: PollenType | string): string[] => {
  switch (pollen) {
    case PollenType.ALL:
      return POLLENS_IDS;
    case PollenType.NON_ALLERGENIC:
      return NON_ALLERGENIC_POLLENS_IDS;
    case PollenType.ALLERGENIC:
      return ALLERGENIC_POLLENS_IDS;
    default:
      return [pollen];
  }
};

const computeChartData = async (period: Period | number, pollenType: PollenType | string, intl: IntlShape): Promise<RatesChartData> => {
  const intlCollator = new Intl.Collator(intl.locale);
  const dateFormatter = new Intl.DateTimeFormat(intl.locale, { month: 'short', day: 'numeric' });

  const rawData: PollensRates = await getPollensRateByYear(period < 0 ? CURRENT_YEAR : period);
  const pollenIds = getPollensListFromPollenType(pollenType);

  const datesList = uniq(pollenIds.flatMap(id => Object.keys(rawData[id])));
  const minDate = period < 0 ? subDays(new Date(), -period + 1) : new Date(CURRENT_YEAR, 0, 1);
  const filteredDatesList = period < 0 ? datesList.filter(date => isAfter(parse(date, DATA_DATE_FORMAT, new Date()), minDate)) : datesList;

  const pollens: [string, string][] = pollenIds
    .map(id => ([id, intl.formatMessage({ id: `pollen.${id}` })]))
    .sort(([, a], [, b]) => intlCollator.compare(a, b)) as [string, string][];

  const data = filteredDatesList.sort().map(date => ({
    date: dateFormatter.format(parse(date, DATA_DATE_FORMAT, new Date())),
    ...pollens.reduce((acc, [pollenId, pollenName]) => ({
      ...acc,
      [pollenName]: rawData[pollenId][date].rate,
    }), {}),
  }));

  return {
    data,
    categories: pollens.map(([, pollenName]) => pollenName),
  };
};

const shouldDisplayPeriod = (period: Period): boolean => {
  return isAfter(subDays(NOW, -period), startOfYear(NOW));
};

export interface RatesChartProps {
  currentPollenType: PollenType | string;
  setCurrentPollenType: (pollenId: PollenType | string) => void;
}

export const RatesChart: FC<RatesChartProps> = ({ currentPollenType, setCurrentPollenType }) => {
  const intl = useIntl();
  const [loading, setLoading] = useState<boolean>(true);
  const [period, setPeriod] = useState<Period | number>(shouldDisplayPeriod(Period.LAST_10_DAYS) ? Period.LAST_10_DAYS : CURRENT_YEAR);
  const [chartData, setChartData] = useState<RatesChartData>({ data: [], categories: [] });

  useEffect(() => {
    setLoading(true);
    (async () => {
      const chartData = await computeChartData(period, currentPollenType, intl);
      setChartData(chartData);
      setLoading(false);
    })();
  }, [period, currentPollenType, intl.locale]);

  const periodDropdownChildren = [
    ...Object.entries(Period).filter(([, periodValue]) => shouldDisplayPeriod(periodValue as Period)).map(([periodKey, periodValue]) => (
      <DropdownItem value={periodValue.toString()} text={intl.formatMessage({ id: `rates-chart.period.${periodKey}` })}
                    key={periodKey} />
    )),
    ...range(DATA_MIN_YEAR, CURRENT_YEAR + 1).reverse().map(year => (
      <DropdownItem value={year.toString()} text={`en ${year}`} key={year} />
    )),
  ];

  const intlCollator = new Intl.Collator(intl.locale);
  const pollens: [string, string][] = POLLENS_IDS
    .map(id => ([id, intl.formatMessage({ id: `pollen.${id}` })]))
    .sort(([, a], [, b]) => intlCollator.compare(a, b)) as [string, string][];

  const pollensDropdownChildren = [
    ...Object.keys(PollenType).map(pollenType => (
      <DropdownItem value={pollenType} text={intl.formatMessage({ id: `rates-chart.pollen-type.${pollenType}` })}
                    key={pollenType} />
    )),
    ...pollens.map(([id, name]) => (
      <DropdownItem value={id} text={name} key={id} />
    )),
  ];

  return (
    <Card>
      <div className='flex flex-col md:flex-row'>
        <Title><FormattedMessage id='rates-chart.title' /></Title>
        <Dropdown
          className='max-w-[12rem] mt-2 mb-2 md:mb-0 md:ml-2 md:mr-2 md:-mt-1'
          onValueChange={(value) => setPeriod(parseInt(value))}
          value={period.toString()}
        >
          {periodDropdownChildren}
        </Dropdown>
        <Title><FormattedMessage id='rates-chart.title-for' /></Title>
        <Dropdown
          className='max-w-[15rem] mt-2 md:ml-2 md:mr-2 md:-mt-1'
          onValueChange={(value) => setCurrentPollenType(value)}
          value={currentPollenType}
        >
          {pollensDropdownChildren}
        </Dropdown>
      </div>
      {loading ? (
        <div className='flex h-80'>
          <Spin />
        </div>
      ) : (
        <LineChart
          className='mt-6'
          data={chartData.data}
          index='date'
          categories={chartData.categories}
          yAxisWidth={40}
          showAnimation={false}
          colors={CHART_COLORS}
        />
      )}
    </Card>
  );
};
