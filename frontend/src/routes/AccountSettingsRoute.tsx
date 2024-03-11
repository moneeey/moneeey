import { AccountTable } from "../tables/AccountTable";
import { AccountKind } from "../entities/Account";

import HomeRoute from "./HomeRouter";
import { IAppParameters, IRouteParameters, Route } from "./Route";

type IAccountSettingsRoute = IRouteParameters;

export class AccountSettingsRouter extends Route<IAccountSettingsRoute> {
	constructor() {
		super("/settings/accounts", HomeRoute);
		this.parent?.addChild(this);
	}

	render({ app }: { app: IAppParameters }) {
		return (
			<AccountTable
				currencies={app.moneeeyStore.currencies}
				accounts={app.moneeeyStore.accounts}
				navigation={app.moneeeyStore.navigation}
				kind={AccountKind.CHECKING}
				schemaFilter={(row) => row.kind !== AccountKind.PAYEE}
			/>
		);
	}
}

export const AccountSettingsRoute = new AccountSettingsRouter();
