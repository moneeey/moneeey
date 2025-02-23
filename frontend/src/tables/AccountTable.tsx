import { observer } from "mobx-react-lite";

import TableEditor from "../components/TableEditor";
import { PrimaryButton, SecondaryButton } from "../components/base/Button";
import Space from "../components/base/Space";
import AccountKindField from "../components/editor/AccountKindField";
import CheckboxField from "../components/editor/CheckboxField";
import CurrencySelectorField from "../components/editor/CurrencySelectorField";
import DateField from "../components/editor/DateField";
import TagField from "../components/editor/TagField";
import TextField from "../components/editor/TextField";
import type { AccountKind, IAccount } from "../entities/Account";
import { NavigationModal } from "../shared/Navigation";
import useMoneeeyStore from "../shared/useMoneeeyStore";
import useMessages from "../utils/Messages";

interface AccountSettingsProps {
	kind: AccountKind;
	schemaFilter: (row: IAccount) => boolean;
}

export const AccountTableHeader = () => {
	const { navigation } = useMoneeeyStore();
	const Messages = useMessages();
	return (
		<Space className="scale-75">
			<SecondaryButton
				onClick={() => navigation.openModal(NavigationModal.MERGE_ACCOUNTS)}
			>
				{Messages.modal.merge_accounts}
			</SecondaryButton>
			<PrimaryButton
				testId="addAccount"
				onClick={() => navigation.openModal(NavigationModal.ADD_ACCOUNT)}
			>
				{Messages.account.add_account}
			</PrimaryButton>
		</Space>
	);
};

const AccountTable = observer(
	({ schemaFilter, kind }: AccountSettingsProps) => {
		const { accounts } = useMoneeeyStore();
		const Messages = useMessages();

		return (
			<>
				<div className="h-full grow" key={`accountTable${kind}`}>
					<TableEditor<IAccount>
						key={`accountTable${kind}`}
						testId={`accountTable${kind}`}
						store={accounts}
						schemaFilter={schemaFilter}
						factory={(id?: string) => ({ ...accounts.factory(id), kind })}
						schema={[
							{
								title: Messages.util.name,
								width: 80,
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
								width: 120,
								required: true,
								validate: () => ({ valid: true }),
								...CurrencySelectorField<IAccount>({
									read: ({ currency_uuid }) => currency_uuid,
									delta: (currency_uuid) => ({ currency_uuid }),
								}),
							},
							{
								title: Messages.util.tags,
								width: 80,
								validate: () => ({ valid: true }),
								...TagField<IAccount>({
									read: ({ tags }) => tags,
									delta: (tags) => ({ tags }),
								}),
							},
							{
								title: Messages.account.account_kind,
								width: 80,
								validate: () => ({ valid: true }),
								...AccountKindField<IAccount>({
									read: ({ kind: currentKind }) => currentKind,
									delta: (newKind: AccountKind) => ({ kind: newKind }),
								}),
							},
							{
								title: Messages.account.offbudget,
								width: 80,
								validate: () => ({ valid: true }),
								...CheckboxField<IAccount>({
									read: ({ offbudget }) => offbudget,
									delta: (offbudget) => ({ offbudget }),
								}),
							},
							{
								title: Messages.util.archived,
								width: 80,
								validate: () => ({ valid: true }),
								...CheckboxField<IAccount>({
									read: ({ archived }) => archived,
									delta: (archived) => ({ archived }),
								}),
							},
							{
								title: Messages.util.created,
								width: 80,
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
			</>
		);
	},
);

export default AccountTable;
