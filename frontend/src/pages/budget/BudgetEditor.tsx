import { Dispatch, SetStateAction } from 'react';

import { PrimaryButton, SecondaryButton } from '../../components/base/Button';
import Drawer from '../../components/base/Drawer';
import { Checkbox, Input } from '../../components/base/Input';
import Select, { MultiSelect } from '../../components/base/Select';
import Space, { VerticalSpace } from '../../components/base/Space';
import { TextTitle } from '../../components/base/Text';
import { IBudget } from '../../entities/Budget';
import useMoneeeyStore from '../../shared/useMoneeeyStore';
import Messages from '../../utils/Messages';

const BudgetEditor = ({
  editing,
  setEditing,
}: {
  editing: IBudget;
  setEditing: Dispatch<SetStateAction<IBudget | undefined>>;
}) => {
  const { budget, tags, currencies, config } = useMoneeeyStore();

  const onClose = () => setEditing(undefined);
  const onSave = () => {
    budget.merge(editing);
    setEditing(undefined);
  };

  return (
    <Drawer
      className='editor'
      data-test-id='budgetEditorDrawer'
      header={<TextTitle className='title'>{editing.name || ''}</TextTitle>}>
      <VerticalSpace>
        <label>{Messages.util.name}</label>
        <div className='bg-background-900 p-2'>
          <Input
            data-test-id='budgetName'
            placeholder={Messages.util.name}
            value={editing.name}
            onChange={(name) => setEditing((current) => current && { ...current, name })}
          />
        </div>
        <label>{Messages.util.currency}</label>
        <div className='bg-background-900 p-2'>
          <Select
            data-test-id='budgetCurrency'
            placeholder={Messages.util.currency}
            options={currencies.all.map((c) => ({
              label: c.name,
              value: c.currency_uuid,
            }))}
            value={editing.currency_uuid}
            onChange={(currency_uuid) =>
              setEditing(
                (current) => current && { ...current, currency_uuid: currency_uuid || config.main.default_currency }
              )
            }
          />
        </div>
        <label>{Messages.util.tags}</label>
        <div className='bg-background-900 p-2'>
          <MultiSelect
            data-test-id='budgetTags'
            placeholder={Messages.util.tags}
            options={tags.all.map((t) => ({ label: t, value: t }))}
            value={editing.tags}
            onCreate={(tagName) => {
              tags.register(tagName);
              setEditing((current) => current && { ...current, tags: [...editing.tags, tagName] });
            }}
            onChange={(new_tags: readonly string[]) => setEditing({ ...editing, tags: [...new_tags] })}
          />
        </div>
        <div className='bg-background-900 p-2'>
          <Checkbox
            data-test-id='budgetIsArchived'
            value={editing.archived}
            placeholder={Messages.util.archived}
            onChange={(archived) => setEditing({ ...editing, archived })}>
            {Messages.util.archived}
          </Checkbox>
        </div>
        <Space>
          <SecondaryButton onClick={onClose}>{Messages.util.close}</SecondaryButton>
          <PrimaryButton data-test-id='budgetSave' onClick={onSave} disabled={!editing.name}>
            {Messages.budget.save}
          </PrimaryButton>
        </Space>
      </VerticalSpace>
    </Drawer>
  );
};

export default BudgetEditor;
