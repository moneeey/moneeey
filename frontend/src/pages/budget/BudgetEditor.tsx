import { PrimaryButton, SecondaryButton } from "../../components/base/Button";
import Drawer from "../../components/base/Drawer";
import { Checkbox, Input } from "../../components/base/Input";
import Select, { MultiSelect } from "../../components/base/Select";
import Space, { VerticalSpace } from "../../components/base/Space";
import { TextTitle } from "../../components/base/Text";
import type { IBudget } from "../../entities/Budget";
import { ITransaction } from "../../entities/Transaction";
import useMoneeeyStore from "../../shared/useMoneeeyStore";
import useMessages from "../../utils/Messages";

const ExampleTransactions = ({ searchTags }: { searchTags: string[] }) => {
  const { transactions, accounts } = useMoneeeyStore();
  const Messages = useMessages()
  const exampleTransactions = transactions.sorted.reduce((accum, t) => {
    if (accum.length < 5) {
      const transactionTags = transactions.getAllTransactionTags(t, accounts)
      if (transactionTags.find(tag => searchTags.includes(tag))) {
        return [...accum, t]
      }
    }
    return accum
  }, [] as ITransaction[])

  return <div className="rounded-md bg-background-800 p-2 h-24">
    {exampleTransactions.length === 0 ? <p>{Messages.util.empty}</p> : null}
    {exampleTransactions.map(t => (
      <p title={t.memo}>{
        Messages.budget.format_example(
          accounts.nameForUuid(t.from_account),
          accounts.nameForUuid(t.to_account),
          String(t.from_value))}</p>
    ))}
  </div>
}

const BudgetEditor = ({
  editing,
  setEditing,
}: {
  editing: IBudget;
  setEditing: (budget?: IBudget) => void;
}) => {
  const Messages = useMessages();
  const { budget, tags, currencies, config, transactions, accounts } = useMoneeeyStore();

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
        <label>{Messages.util.currency}</label>
        <Select
          containerArea
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
        <label>{Messages.menu.transactions}</label>
        <ExampleTransactions searchTags={editing.tags} />
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
