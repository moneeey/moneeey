import { PrimaryButton, SecondaryButton } from "../../components/base/Button";
import Drawer from "../../components/base/Drawer";
import { Checkbox, Input } from "../../components/base/Input";
import Select, { MultiSelect } from "../../components/base/Select";
import Space, { VerticalSpace } from "../../components/base/Space";
import { TextTitle } from "../../components/base/Text";
import type { IBudget } from "../../entities/Budget";
import useMoneeeyStore from "../../shared/useMoneeeyStore";
import useMessages from "../../utils/Messages";

const BudgetEditor = ({
	editing,
	setEditing,
}: {
	editing: IBudget;
	setEditing: (budget?: IBudget) => void;
}) => {
	const Messages = useMessages();
	const { budget, tags, currencies, config } = useMoneeeyStore();

	const onClose = () => setEditing(undefined);
	const onSave = () => {
		budget.merge(editing);
		setEditing(undefined);
	};

	return (
		<Drawer
			className="editor"
			testId="budgetEditorDrawer"
			key={`${editing.budget_uuid}_${editing._rev}`}
			header={<TextTitle className="title">{editing.name || ""}</TextTitle>}
		>
			<VerticalSpace>
				<label>{Messages.util.name}</label>
				<div className="bg-background-900 p-2">
					<Input
						testId="budgetName"
						placeholder={Messages.util.name}
						value={editing.name}
						onChange={(name) => setEditing({ ...editing, name })}
					/>
				</div>
				<label>{Messages.util.currency}</label>
				<div className="bg-background-900 p-2">
					<Select
						testId="budgetCurrency"
						placeholder={Messages.util.currency}
						options={currencies.all.map((c) => ({
							label: (
								<span>
									<b>{c.short}</b> {c.name}
								</span>
							),
							value: c.currency_uuid,
						}))}
						value={editing.currency_uuid}
						onChange={(currency_uuid) =>
							setEditing({
								...editing,
								currency_uuid: currency_uuid || config.main.default_currency,
							})
						}
					/>
				</div>
				<label>{Messages.util.tags}</label>
				<div className="bg-background-900 p-2">
					<MultiSelect
						testId="budgetTags"
						placeholder={Messages.util.tags}
						options={tags.all.map((t) => ({ label: t, value: t }))}
						value={editing.tags}
						onCreate={(tagName) => {
							tags.register(tagName);
							setEditing({ ...editing, tags: [...editing.tags, tagName] });
						}}
						onChange={(new_tags: readonly string[]) =>
							setEditing({ ...editing, tags: [...new_tags] })
						}
					/>
				</div>
				<div className="bg-background-900 p-2">
					<Checkbox
						testId="budgetIsArchived"
						value={editing.archived}
						placeholder={Messages.util.archived}
						onChange={(archived) => setEditing({ ...editing, archived })}
					>
						{Messages.util.archived}
					</Checkbox>
				</div>
				<Space>
					<SecondaryButton onClick={onClose}>
						{Messages.util.close}
					</SecondaryButton>
					<PrimaryButton
						testId="budgetSave"
						onClick={onSave}
						disabled={!editing.name}
					>
						{Messages.budget.save}
					</PrimaryButton>
				</Space>
			</VerticalSpace>
		</Drawer>
	);
};

export default BudgetEditor;
