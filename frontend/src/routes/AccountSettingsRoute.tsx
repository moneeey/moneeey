import { AccountTable } from '../tables/AccountTable';
import { AccountKind } from '../entities/Account';

import HomeRoute from './HomeRouter';
import { IAppParameters, IRouteParameters, Route } from './Route';

type IAccountSettingsRoute = IRouteParameters;

export class AccountSettingsRouter extends Route<IAccountSettingsRoute> {
  constructor() {
    super('/settings/accounts', HomeRoute);
    this.parent?.addChild(this);
  }

  render({ app }: { app: IAppParameters }) {
    return (
      <section className='settingsArea'>
        <AccountTable
          currencies={app.moneeeyStore.currencies}
          accounts={app.moneeeyStore.accounts}
          kind={AccountKind.CHECKING}
        />
      </section>
    );
  }
}

export const AccountSettingsRoute = new AccountSettingsRouter();
