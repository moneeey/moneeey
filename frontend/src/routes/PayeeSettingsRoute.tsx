import { AccountKind } from "../entities/Account";
import AccountTable, { AccountTableHeader } from "../tables/AccountTable";

import HomeRoute from "./HomeRouter";
import Route, { type IRouteParameters } from "./Route";

type IPayeeSettingsRoute = IRouteParameters;

export class PayeeSettingsRouter extends Route<IPayeeSettingsRoute> {
	constructor() {
		super("/settings/payee", HomeRoute);
		this.parent?.addChild(this);
	}

	render() {
		return (
			<AccountTable
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
