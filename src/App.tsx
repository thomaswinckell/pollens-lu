import { Divider, Dropdown, DropdownItem, Text, Title } from '@tremor/react';
import { FormattedMessage, IntlProvider } from 'react-intl';
import { useEffect, useState } from 'react';
import { RatesChart } from './components/RatesChart';
import { Spin } from './components/Spin';
import { Head } from './components/Head';
import { UPDATE_DATE } from './api/PollensApi';
import { RatesCallout } from './components/RatesCallout';
import { PollenType } from './models/PollenType';
import { RatesCompareChart } from './components/RatesCompareChart';

const SUPPORTED_LOCALES = ['en', 'fr'];
const DEFAULT_LOCALE = 'en';

const getUserPreferredLanguage = () => {
  return window.navigator.languages.map(locale => locale.substring(0, 2).toLowerCase()).find(locale => SUPPORTED_LOCALES.includes(locale)) || DEFAULT_LOCALE;
};


export const App = () => {
  const [locale, setLocale] = useState<string>(getUserPreferredLanguage());
  const [messages, setMessages] = useState<Record<string, string> | undefined>();
  const [currentPollenType, setCurrentPollenType] = useState<PollenType | string>(PollenType.ALLERGENIC);

  useEffect(() => {
    setMessages(undefined);
    (async () => {
      const messages = await import(`./intl/${locale}.json`);
      setMessages(messages.default);
    })();
  }, [locale]);

  if (!messages) {
    return (
      <div className='flex h-screen'>
        <Spin />
      </div>
    );
  }

  const updateDate = new Intl.DateTimeFormat(locale, { dateStyle: 'full' }).format(UPDATE_DATE);
  const isCurrentPollenTypeAPollenId = !Object.keys(PollenType).includes(currentPollenType);

  return (
    <IntlProvider messages={messages} locale={locale}>
      <Head locale={locale} />
      <main className='p-4 sm:p-10'>
        <div className='flex justify-between flex-col-reverse sm:flex-row'>
          <div className='flex'>
            <Title><FormattedMessage id='dashboard.title' /></Title>
          </div>
          <Dropdown className='max-w-[10rem] mb-4 sm:mb-0 sm:ml-2 sm:-mt-1' value={locale} onValueChange={setLocale}>
            <DropdownItem value='en' text='English' />
            <DropdownItem value='fr' text='Français' />
          </Dropdown>
        </div>
        <Text className='italic'>
          <FormattedMessage
            id='dashboard.updated-date'
            values={{ date: updateDate, link: (<a href="http://pollen.lu/" target='_blank' className='hover:underline'>pollen.lu</a>) }}
          />
        </Text>
        <div className='pt-8'>
          <RatesCallout setCurrentPollen={setCurrentPollenType} />
        </div>
        <div className='pt-8' id='rates-chart'>
          <RatesChart currentPollenType={currentPollenType} setCurrentPollenType={setCurrentPollenType} />
        </div>
        {isCurrentPollenTypeAPollenId && (
          <div className='pt-8'>
            <RatesCompareChart currentPollenType={currentPollenType} setCurrentPollenType={setCurrentPollenType} />
          </div>
        )}
        <footer className='pt-20'>
          <Divider />
          <div className='flex flex-1 pt-8'>
            <Text className='m-auto hover:underline'>
              <a href='https://github.com/thomaswinckell/pollens-lu' target='_blank'>Checkout the code from GitHub</a>
            </Text>
          </div>
          <div className='flex flex-1 pt-8'>
            <Text className='m-auto hover:underline'>
              <a href="https://www.flaticon.com/free-icons/bee" title="bee icons">Bee icons created by Freepik - Flaticon</a>
            </Text>
          </div>
        </footer>
      </main>
    </IntlProvider>
  );
};
