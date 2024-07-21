import { isEmpty } from "lodash";

import AccountRoute from "../../routes/AccountRoute";
import { AccountSettingsRoute } from "../../routes/AccountSettingsRoute";
import BudgetRoute from "../../routes/BudgetRoute";
import { CurrencySettingsRoute } from "../../routes/CurrencySettingsRoute";
import ImportRoute from "../../routes/ImportRoute";
import type { IBaseEntity } from "../../shared/Entity";
import type MappedStore from "../../shared/MappedStore";
import type MoneeeyStore from "../../shared/MoneeeyStore";
import type { TMessages } from "../../utils/Messages";

import type { TourStep } from "./Tour";

export default function TourSteps(
	{ navigation, budget, accounts }: MoneeeyStore,
	Messages: TMessages,
): TourStep[] {
	const navigateTo = (url: string) => () => navigation.navigate(url);

	const checkStoreIsNotEmpty = <T extends IBaseEntity>(
		store: MappedStore<T>,
		message: string,
	) => {
		if (isEmpty(store.all)) {
			navigation.warning(message);

			return false;
		}

		return true;
	};

	const firstNonPayee = accounts.allNonPayees[0];
	const accountTransactionsUrl = firstNonPayee
		? AccountRoute.accountUrlForName(firstNonPayee.name)
		: AccountRoute.accountUrlForAll();

	return [
		{
			content: Messages.tour.currencies,
			action: navigateTo(CurrencySettingsRoute.url()),
			blinkers: [".currencyTable-body", ".mn-active-navbar"],
		},
		{
			content: Messages.tour.accounts,
			action: navigateTo(AccountSettingsRoute.url()),
			blinkers: [
				".accountTableCHECKING-body",
				".mn-active-navbar",
				"[data-testid=addAccount]",
			],
		},
		{
			content: Messages.tour.transactions,
			action: navigateTo(accountTransactionsUrl),
			blinkers: [".transactionTable-body", ".mn-active-navbar"],
		},
		{
			content: Messages.tour.budgets,
			action: navigateTo(BudgetRoute.url()),
			canGoNextStep: () =>
				checkStoreIsNotEmpty(budget, Messages.tour.please_create_budget),
			blinkers: [".mn-active-navbar", "[data-testid=addNewBudget]"],
		},
		{
			content: Messages.tour.import,
			action: navigateTo(ImportRoute.url()),

			blinkers: [".mn-active-navbar"],
		},
		{
			content: Messages.tour.your_turn,
			action: navigateTo(AccountRoute.accountUrlForAll()),
			blinkers: [],
		},
		{ content: "", action: (tour) => tour.close(), blinkers: [] },
	];
}
