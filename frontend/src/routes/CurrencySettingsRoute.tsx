import { CurrencyTable } from '../tables/CurrencyTable';

import HomeRoute from './HomeRouter';
import { IAppParameters, IRouteParameters, Route } from './Route';

type ICurrencySettingsRoute = IRouteParameters;

export class CurrencySettingsRouter extends Route<ICurrencySettingsRoute> {
  constructor() {
    super('/settings/currencies', HomeRoute);
    this.parent?.addChild(this);
  }

  render({ app }: { app: IAppParameters }) {
    return (
      <section className='settingsArea'>
        <CurrencyTable currencies={app.moneeeyStore.currencies} />
      </section>
    );
  }
}

export const CurrencySettingsRoute = new CurrencySettingsRouter();
