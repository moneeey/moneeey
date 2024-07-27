import type { ITransaction } from "../entities/Transaction";
import useMoneeeyStore from "../shared/useMoneeeyStore";

import TransactionTable from "../tables/TransactionTable";

import HomeRoute from "./HomeRouter";
import Route, { type IRouteParameters } from "./Route";

interface ITagsRoute extends IRouteParameters {
	tag: string;
}

class TagsRouter extends Route<ITagsRoute> {
	constructor() {
		super("/tags/:tag", HomeRoute);
		this.parent?.addChild(this);
	}

	render({ parameters }: { parameters: ITagsRoute }) {
		const { transactions, accounts, currencies } = useMoneeeyStore();
		const filterByTag = transactions.filterByTag(parameters.tag, accounts);
		const schemaFilter = (row: ITransaction) => filterByTag(row);
		const referenceAccount = "";

		return (
			<TransactionTable
				tableId={`tagsTransactions${parameters.tag}`}
				{...{
					transactions,
					accounts,
					currencies,
					schemaFilter,
					referenceAccount,
					tag: parameters.tag,
				}}
			/>
		);
	}

	tagsUrl(tag: string) {
		return this.url({ tag });
	}
}

const TagsRoute = new TagsRouter();
export default TagsRoute;
