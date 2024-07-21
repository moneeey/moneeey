import { observer } from "mobx-react-lite";

import TableEditor from "../components/TableEditor";
import { SecondaryButton } from "../components/base/Button";
import Space, { VerticalSpace } from "../components/base/Space";
import AccountKindField from "../components/editor/AccountKindField";
import CheckboxField from "../components/editor/CheckboxField";
import CurrencySelectorField from "../components/editor/CurrencySelectorField";
import DateField from "../components/editor/DateField";
import TagField from "../components/editor/TagField";
import TextField from "../components/editor/TextField";
import type { AccountKind, AccountStore, IAccount } from "../entities/Account";
import type { CurrencyStore } from "../entities/Currency";
import type NavigationStore from "../shared/Navigation";
import { NavigationModal } from "../shared/Navigation";
import useMessages from "../utils/Messages";
import { HeaderContent } from "../components/AppMenu";

interface AccountSettingsProps {
	accounts: AccountStore;
	currencies: CurrencyStore;
	navigation: NavigationStore;
	kind: AccountKind;
	schemaFilter: (row: IAccount) => boolean;
}

const AccountTable = observer(
	({ accounts, schemaFilter, kind, navigation }: AccountSettingsProps) => {
		const Messages = useMessages();

		return (
			<VerticalSpace className="h-full grow" key={`accountTable${kind}`}>
				<HeaderContent>
					<Space className="p-2 scale-75">
						<SecondaryButton
							onClick={() =>
								navigation.openModal(NavigationModal.MERGE_ACCOUNTS)
							}
						>
							{Messages.modal.merge_accounts}
						</SecondaryButton>
					</Space>
				</HeaderContent>

				<div className="grow">
					<TableEditor<IAccount>
						testId={`accountTable${kind}`}
						store={accounts}
						schemaFilter={schemaFilter}
						factory={(id?: string) => ({ ...accounts.factory(id), kind })}
						schema={[
							{
								title: Messages.util.name,
								width: 300,
								validate: ({ name }) => ({
									valid: name.length > 2,
									error: "Invalid name",
								}),
								...TextField<IAccount>({
									read: ({ name }) => name,
									delta: (name) => ({ name }),
								}),
							},
							{
								title: Messages.util.currency,
								width: 200,
								required: true,
								validate: () => ({ valid: true }),
								...CurrencySelectorField<IAccount>({
									read: ({ currency_uuid }) => currency_uuid,
									delta: (currency_uuid) => ({ currency_uuid }),
								}),
							},
							{
								title: Messages.util.tags,
								width: 200,
								validate: () => ({ valid: true }),
								...TagField<IAccount>({
									read: ({ tags }) => tags,
									delta: (tags) => ({ tags }),
								}),
							},
							{
								title: Messages.account.account_kind,
								width: 200,
								validate: () => ({ valid: true }),
								...AccountKindField<IAccount>({
									read: ({ kind: currentKind }) => currentKind,
									delta: (newKind: AccountKind) => ({ kind: newKind }),
								}),
							},
							{
								title: Messages.account.offbudget,
								width: 200,
								validate: () => ({ valid: true }),
								...CheckboxField<IAccount>({
									read: ({ offbudget }) => offbudget,
									delta: (offbudget) => ({ offbudget }),
								}),
							},
							{
								title: Messages.util.archived,
								width: 200,
								validate: () => ({ valid: true }),
								...CheckboxField<IAccount>({
									read: ({ archived }) => archived,
									delta: (archived) => ({ archived }),
								}),
							},
							{
								title: Messages.util.created,
								width: 200,
								readOnly: true,
								validate: () => ({ valid: true }),
								...DateField<IAccount>({
									read: ({ created }) => created,
									delta: (created) => ({ created }),
								}),
							},
						]}
					/>
				</div>
			</VerticalSpace>
		);
	},
);

export default AccountTable;
