import { Drawer, Form } from 'antd';
import { Dispatch, SetStateAction } from 'react';

import { PrimaryButton, SecondaryButton } from '../../components/base/Button';
import { Checkbox, Input } from '../../components/base/Input';
import Select from '../../components/base/Select';
import Space from '../../components/base/Space';
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
      title={editing.name || ''}
      width={500}
      placement='right'
      onClose={onClose}
      open={true}
      extra={
        <Space>
          <SecondaryButton onClick={onClose}>{Messages.util.close}</SecondaryButton>
          <PrimaryButton data-test-id='budgetSave' onClick={onSave}>
            {Messages.budget.save}
          </PrimaryButton>
        </Space>
      }>
      <Form layout='vertical'>
        <Form.Item label={Messages.util.name}>
          <Input
            data-test-id='budgetName'
            type='text'
            placeholder={Messages.util.name}
            value={editing.name}
            onChange={({ target: { value: name } }) => setEditing({ ...editing, name })}
          />
        </Form.Item>
        <Form.Item label={Messages.util.currency}>
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
        </Form.Item>
        <Form.Item label={Messages.util.tags}>
          <Select
            data-test-id='budgetTags'
            mode='tags'
            placeholder={Messages.util.tags}
            options={tags.all.map((t) => ({ label: t, value: t }))}
            value={editing.tags}
            onChange={(new_tags: string[]) => setEditing({ ...editing, tags: new_tags })}
          />
        </Form.Item>
        <Form.Item>
          <Checkbox
            data-test-id='budgetIsArchived'
            checked={editing.archived}
            onChange={({ target: { checked: archived } }) => setEditing({ ...editing, archived })}>
            {Messages.util.archived}
          </Checkbox>
        </Form.Item>
      </Form>
    </Drawer>
  );
};

export default BudgetEditor;
