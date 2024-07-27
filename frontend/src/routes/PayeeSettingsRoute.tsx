import { AccountKind } from "../entities/Account";
import AccountTable, { AccountTableHeader } from "../tables/AccountTable";

import HomeRoute from "./HomeRouter";
import { type IAppParameters, type IRouteParameters, Route } from "./Route";

type IPayeeSettingsRoute = IRouteParameters;

export class PayeeSettingsRouter extends Route<IPayeeSettingsRoute> {
	constructor() {
		super("/settings/payee", HomeRoute);
		this.parent?.addChild(this);
	}

	render({ app }: { app: IAppParameters }) {
		return (
			<AccountTable
				accounts={app.moneeeyStore.accounts}
				currencies={app.moneeeyStore.currencies}
				navigation={app.moneeeyStore.navigation}
				kind={AccountKind.PAYEE}
				schemaFilter={(row) => row.kind === AccountKind.PAYEE}
			/>
		);
	}

	header() {
		return <AccountTableHeader />;
	}
}

export const PayeeSettingsRoute = new PayeeSettingsRouter();
