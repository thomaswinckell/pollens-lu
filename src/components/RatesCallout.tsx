import { useIntl } from 'react-intl';
import { FC, useEffect, useState } from 'react';
import { Callout, Card } from '@tremor/react';
import { Spin } from './Spin';
import { ALLERGENIC_POLLENS_IDS, getPollensRateByYear } from '../api/PollensApi';
import { DATA_DATE_FORMAT } from '../constants/DataConstants';
import { differenceInCalendarDays, parse, startOfDay } from 'date-fns';
import { PollenLevel } from '../models/PollenLevel';
import { CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/solid';

const TODAY = startOfDay(new Date());

type AllergenicPollensLevels = { pollenId: string, maxLevel: PollenLevel, maxRate: number; }[];

export interface RatesCalloutProps {
  setCurrentPollen: (pollenId: string) => void;
}

export const RatesCallout: FC<RatesCalloutProps> = ({setCurrentPollen}) => {
  const intl = useIntl();
  const [loading, setLoading] = useState<boolean>(true);
  const [pollensLevels, setPollensLevels] = useState<AllergenicPollensLevels>([]);

  useEffect(() => {
    (async () => {
      const currentYearRates = await getPollensRateByYear(TODAY.getFullYear());

      const computedPollensLevel: AllergenicPollensLevels = [];
      Object.keys(currentYearRates).forEach(pollenId => {
        if (ALLERGENIC_POLLENS_IDS.includes(pollenId)) {
          let maxLevel = PollenLevel.LOW;
          let maxRate = 0;
          Object.keys(currentYearRates[pollenId]).forEach(date => {
            // we take only data from the last 5 days
            if (differenceInCalendarDays(TODAY, startOfDay(parse(date, DATA_DATE_FORMAT, new Date()))) <= 5) {
              maxLevel = Math.max(maxLevel, currentYearRates[pollenId][date].level);
              maxRate = Math.max(maxRate, currentYearRates[pollenId][date].rate);
            }
          });
          if (maxLevel > PollenLevel.LOW) {
            computedPollensLevel.push({ pollenId, maxLevel, maxRate });
          }
        }
      });

      setPollensLevels(computedPollensLevel);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <Card className='max-w-md'>
        <div className='flex h-28'>
          <Spin />
        </div>
      </Card>
    );
  }

  if (pollensLevels.length === 0) {
    return (
      <Card className='max-w-md'>
        <Callout
          title={intl.formatMessage({ id: 'rates-callout.low-levels.title' })}
          icon={CheckCircleIcon}
          color='teal'
        >
          {intl.formatMessage({ id: 'rates-callout.low-levels.description' })}
        </Callout>
      </Card>
    );
  }

  return (
    <Card className='max-w-md'>
      {pollensLevels.map((data, index) => (
        <Callout
          key={index}
          className={index === 0 ? '' : 'mt-4'}
          title={intl.formatMessage({
            id: data.maxLevel === PollenLevel.MODERATE ? 'rates-callout.moderate-levels.title' : 'rates-callout.severe-levels.title'
          }, {
            pollen: intl.formatMessage({id: `pollen.${data.pollenId}`})
          })}
          icon={ExclamationTriangleIcon}
          color={data.maxLevel === PollenLevel.MODERATE ? 'amber' : 'rose'}
        >
          {intl.formatMessage({
            id: data.maxLevel === PollenLevel.MODERATE ? 'rates-callout.moderate-levels.description' : 'rates-callout.severe-levels.description'
          }, {
            pollen: intl.formatMessage({id: `pollen.${data.pollenId}`}).toLowerCase(),
            maxRate: data.maxRate
          })}
          <a href="#rates-chart" onClick={() => setCurrentPollen(data.pollenId)} className="underline flex mt-1">
            {intl.formatMessage(
              {id: `rates-callout.go-to-pollen-chart`},
              {pollen: intl.formatMessage({id: `pollen.${data.pollenId}`}).toLowerCase()}
            )}
          </a>
        </Callout>
      ))}
    </Card>
  );
};
