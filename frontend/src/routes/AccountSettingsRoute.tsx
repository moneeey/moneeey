import { AccountKind } from "../entities/Account";
import useMoneeeyStore from "../shared/useMoneeeyStore";
import AccountTable, { AccountTableHeader } from "../tables/AccountTable";

import HomeRoute from "./HomeRouter";
import Route, { type IRouteParameters } from "./Route";

type IAccountSettingsRoute = IRouteParameters;

export class AccountSettingsRouter extends Route<IAccountSettingsRoute> {
	constructor() {
		super("/settings/accounts", HomeRoute);
		this.parent?.addChild(this);
	}

	render() {
		return (
			<AccountTable
				kind={AccountKind.CHECKING}
				schemaFilter={(row) => row.kind !== AccountKind.PAYEE}
			/>
		);
	}

	header() {
		return <AccountTableHeader />;
	}
}

export const AccountSettingsRoute = new AccountSettingsRouter();
