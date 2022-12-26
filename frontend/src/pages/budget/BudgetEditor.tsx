import { Dispatch, SetStateAction } from 'react';

import { PrimaryButton, SecondaryButton } from '../../components/base/Button';
import Drawer from '../../components/base/Drawer';
import { Checkbox, Input } from '../../components/base/Input';
import Select from '../../components/base/Select';
import Space, { VerticalSpace } from '../../components/base/Space';
import { IBudget } from '../../entities/Budget';
import { TCurrencyUUID } from '../../entities/Currency';
import useMoneeeyStore from '../../shared/useMoneeeyStore';
import Messages from '../../utils/Messages';

const BudgetEditor = ({
  editing,
  setEditing,
}: {
  editing?: IBudget;
  setEditing: Dispatch<SetStateAction<IBudget | undefined>>;
}) => {
  const { budget, tags, currencies } = useMoneeeyStore();

  const onClose = () => setEditing(undefined);
  const onSave = () => {
    if (editing) {
      budget.merge(editing);
      setEditing(undefined);
    }
  };

  if (!editing) {
    return <div />;
  }

  return (
    <Drawer
      className='editor'
      data-test-id='budgetEditorDrawer'
      header={
        <>
          <Space>
            <span className='title'>{editing.name || ''}</span>
            <SecondaryButton onClick={onClose}>{Messages.util.close}</SecondaryButton>
            <PrimaryButton data-test-id='budgetSave' onClick={onSave} disabled={!editing.name}>
              {Messages.budget.save}
            </PrimaryButton>
          </Space>
        </>
      }>
      <VerticalSpace>
        <label>{Messages.util.name}</label>
        <Input
          data-test-id='budgetName'
          type='text'
          placeholder={Messages.util.name}
          value={editing.name}
          onChange={({ target: { value: name } }) => setEditing({ ...editing, name })}
        />
        <label>{Messages.util.currency}</label>
        <Select
          data-test-id='budgetCurrency'
          placeholder={Messages.util.currency}
          options={currencies.all.map((c) => ({
            label: c.name,
            value: c.currency_uuid,
          }))}
          value={editing.currency_uuid}
          onChange={(currency_uuid: TCurrencyUUID) => setEditing({ ...editing, currency_uuid })}
        />
        <label>{Messages.util.tags}</label>
        <Select
          data-test-id='budgetTags'
          mode='tags'
          placeholder={Messages.util.tags}
          options={tags.all.map((t) => ({ label: t, value: t }))}
          value={editing.tags}
          onChange={(new_tags: string[]) => setEditing({ ...editing, tags: new_tags })}
        />
        <Checkbox
          data-test-id='budgetIsArchived'
          checked={editing.archived}
          onChange={({ target: { checked: archived } }) => setEditing({ ...editing, archived })}>
          {Messages.util.archived}
        </Checkbox>
      </VerticalSpace>
    </Drawer>
  );
};

export default BudgetEditor;
