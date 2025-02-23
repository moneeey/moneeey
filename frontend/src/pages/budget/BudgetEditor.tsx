import { PrimaryButton, SecondaryButton } from "../../components/base/Button";
import Drawer from "../../components/base/Drawer";
import { Checkbox, Input } from "../../components/base/Input";
import { MultiSelect } from "../../components/base/Select";
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
	const { budget, tags } = useMoneeeyStore();

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
				<Input
					containerArea
					testId="budgetName"
					placeholder={Messages.util.name}
					value={editing.name}
					onChange={(name) => setEditing({ ...editing, name })}
				/>
				<label>{Messages.util.tags}</label>
				<MultiSelect
					containerArea
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
				<Checkbox
					containerArea
					testId="budgetIsArchived"
					value={editing.archived}
					placeholder={Messages.util.archived}
					onChange={(archived) => setEditing({ ...editing, archived })}
				>
					{Messages.util.archived}
				</Checkbox>
			</VerticalSpace>
		</Drawer>
	);
};

export default BudgetEditor;
