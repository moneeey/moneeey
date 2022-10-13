import { AccountTable } from '../tables/AccountTable';
import { AccountKind } from '../entities/Account';

import HomeRoute from './HomeRouter';
import { IAppParameters, IRouteParameters, Route } from './Route';

type IPayeeSettingsRoute = IRouteParameters;

export class PayeeSettingsRouter extends Route<IPayeeSettingsRoute> {
  constructor() {
    super('/settings/payee', HomeRoute);
    this.parent?.addChild(this);
  }

  render({ app }: { app: IAppParameters }) {
    return (
      <AccountTable
        accounts={app.moneeeyStore.accounts}
        currencies={app.moneeeyStore.currencies}
        type={AccountKind.PAYEE}
      />
    );
  }
}

export const PayeeSettingsRoute = new PayeeSettingsRouter();
