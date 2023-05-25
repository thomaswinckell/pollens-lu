import { Card, Dropdown, DropdownItem, LineChart, Title } from '@tremor/react';
import { range, uniq } from 'remeda';
import { useState, useEffect } from 'react';
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

type RatesChartData = { date: string; [pollenId: string]: string }[];

const dateFormatter = new Intl.DateTimeFormat('fr', { month: 'short', day: 'numeric' });

const NOW = new Date();
const CURRENT_YEAR = NOW.getFullYear();

enum Period {
  LAST_10_DAYS = -10,
  LAST_30_DAYS = -30,
  LAST_60_DAYS = -60,
  LAST_90_DAYS = -90,
}

enum PollenType {
  ALL = 'ALL',
  NON_ALLERGENIC = 'NON_ALLERGENIC',
  ALLERGENIC = 'ALLERGENIC',
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
}

const computeChartData = async (period: Period | number, pollenType: PollenType | string): Promise<RatesChartData> => {

  const rawData: PollensRates = await getPollensRateByYear(period < 0 ? CURRENT_YEAR : period);
  const pollenIds = getPollensListFromPollenType(pollenType);

  const datesList = uniq(pollenIds.flatMap(id => Object.keys(rawData[id])));
  const minDate = period < 0 ? subDays(new Date(), -period + 1) : new Date(CURRENT_YEAR, 0, 1);
  const filteredDatesList = period < 0 ? datesList.filter(date => isAfter(parse(date, DATA_DATE_FORMAT, new Date()), minDate)) : datesList;

  return filteredDatesList.sort().map(date => ({
    date: dateFormatter.format(parse(date, DATA_DATE_FORMAT, new Date())),
    ...pollenIds.reduce((acc, pollenId) => ({
      ...acc,
      [pollenId]: rawData[pollenId][date].rate,
    }), {}),
  }));
};

const shouldDisplayPeriod = (period: Period): boolean => {
  return isAfter(subDays(NOW, -period), startOfYear(NOW));
};

export const RatesChart = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [period, setPeriod] = useState<Period | number>(shouldDisplayPeriod(Period.LAST_30_DAYS) ? Period.LAST_30_DAYS : CURRENT_YEAR);
  const [pollenType, setPollenType] = useState<PollenType | string>(PollenType.ALLERGENIC);
  const [chartData, setChartData] = useState<RatesChartData>([]);

  useEffect(() => {
    setLoading(true);
    (async () => {
      const data = await computeChartData(period, pollenType);
      setChartData(data);
    })();
    setLoading(false);
  }, [period, pollenType]);

  const periodDropdownChildren = [
    shouldDisplayPeriod(Period.LAST_30_DAYS) && (
      <DropdownItem value={Period.LAST_30_DAYS.toString()} text="les 30 derniers jours" key={Period.LAST_30_DAYS} />
    ),
    ...range(DATA_MIN_YEAR, CURRENT_YEAR + 1).reverse().map(year => (
      <DropdownItem value={year.toString()} text={`en ${year}`} key={year} />
    )),
  ].filter(Boolean);

  // TODO translate and sort POLLENS_IDS alphabetically
  const pollensDropdownChildren = [
    <DropdownItem value={PollenType.ALL} text="toutes les plantes" key={PollenType.ALL} />,
    <DropdownItem value={PollenType.ALLERGENIC} text="toutes les plantes allergisantes" key={PollenType.ALLERGENIC} />,
    <DropdownItem value={PollenType.NON_ALLERGENIC} text="toutes les plantes non allergisantes" key={PollenType.NON_ALLERGENIC} />,
    ...POLLENS_IDS.map(pollenId => (
      <DropdownItem value={pollenId} text={pollenId} key={pollenId} />
    )),
  ];

  return (
    <Card>
      <div className="flex">
        <Title>
          Grains par m³ d'air
        </Title>
        <Dropdown
          className="max-w-xs ml-2 mr-2 -mt-1"
          onValueChange={(value) => setPeriod(parseInt(value))}
          value={period.toString()}
        >
          {periodDropdownChildren}
        </Dropdown>
        <Title>
          pour
        </Title>
        <Dropdown
          className="max-w-xs ml-2 mr-2 -mt-1"
          onValueChange={(value) => setPollenType(value)}
          value={pollenType}
        >
          {pollensDropdownChildren}
        </Dropdown>
      </div>
      {loading ? <Spin /> : (
        <LineChart
          className="mt-6"
          data={chartData}
          index="date"
          categories={getPollensListFromPollenType(pollenType)}
          yAxisWidth={40}
          showAnimation={false}
        />
      )}
    </Card>
  );
};
