import { Helmet } from 'react-helmet';
import { useIntl } from 'react-intl';
import { FC } from 'react';

export interface HeadProps {
  locale: string;
}

export const Head: FC<HeadProps> = ({ locale }) => {
  const intl = useIntl();
  return (
    <Helmet>
      <html lang={locale} />
      <title>{intl.formatMessage({ id: 'page.title' })}</title>
    </Helmet>
  );
};
