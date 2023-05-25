import { RatesChart } from './components/RatesChart';
import { Card, Grid, Title } from '@tremor/react';

export const App = () => {

  return (
    <main className="p4 sm:p-10">
      <Title>Pollens au Luxembourg</Title>
      <Grid numColsMd={2} numColsLg={3} className="gap-6 mt-6">
        <Card>
          <div className="h-28" />
        </Card>
        <Card>
          <div className="h-28" />
        </Card>
        <Card>
          <div className="h-28" />
        </Card>
      </Grid>
      <div className="mt-6">
        <RatesChart/>
      </div>
    </main>
  );
}
