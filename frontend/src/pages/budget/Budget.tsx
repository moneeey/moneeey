import { Drawer, Form } from 'antd';
import { map, range } from 'lodash';
import { observer } from 'mobx-react';
import { Dispatch, SetStateAction, useEffect, useState } from 'react';

import { LinkButton, PrimaryButton, SecondaryButton } from '../../components/base/Button';
import Card from '../../components/base/Card';
import { Checkbox, Input } from '../../components/base/Input';
import Select from '../../components/base/Select';
import Space from '../../components/base/Space';
import { NormalText } from '../../components/base/Text';
import { TableEditor } from '../../components/TableEditor';
import { IBudget } from '../../entities/Budget';
import { BudgetEnvelope } from '../../entities/BudgetEnvelope';
import { TCurrencyUUID } from '../../entities/Currency';
import useMoneeeyStore from '../../shared/useMoneeeyStore';
import { formatDate, formatDateMonth, startOfMonthOffset } from '../../utils/Date';
import Messages from '../../utils/Messages';

import './Budget.less';

interface PeriodProps {
  startingDate: Date;
  setEditing: Dispatch<SetStateAction<IBudget | undefined>>;
  viewArchived: boolean;
}

const BudgetPeriods = ({
  startingDate,
  setEditing,
  viewArchived,
  viewMonths,
}: PeriodProps & { viewMonths: number }) => (
  <div className='periods'>
    {map(range(0, viewMonths), (offset) => (
      <BudgetPeriod
        key={offset}
        startingDate={startOfMonthOffset(startingDate, offset)}
        setEditing={setEditing}
        viewArchived={viewArchived}
      />
    ))}
  </div>
);

const BudgetPeriod = observer(({ startingDate, setEditing, viewArchived }: PeriodProps) => {
  const { budget } = useMoneeeyStore();
  const starting = formatDate(startingDate);
  useEffect(() => {
    budget.makeEnvelopes(starting);
  }, [startingDate]);
  const onNewBudget = () => setEditing(budget.factory());

  return (
    <Card
      data-test-id={`budget_period_${formatDateMonth(startingDate)}`}
      className='period'
      header={<NormalText>{formatDateMonth(startingDate)}</NormalText>}
      footer={<LinkButton onClick={onNewBudget}>{Messages.budget.new}</LinkButton>}>
      <TableEditor
        store={budget.envelopes}
        factory={budget.envelopes.factory}
        creatable={false}
        schemaFilter={(b) => b.starting === starting && (!b.budget.archived || viewArchived)}
        context={{ name: (env: BudgetEnvelope) => setEditing(env.budget) }}
      />
    </Card>
  );
});

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
          <PrimaryButton onClick={onSave}>{Messages.budget.save}</PrimaryButton>
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
            value={editing.archived}
            onChange={({ target: { checked: archived } }) => setEditing({ ...editing, archived })}>
            {Messages.util.archived}
          </Checkbox>
        </Form.Item>
      </Form>
    </Drawer>
  );
};

const MonthDateSelector = ({ setDate, date }: { setDate: Dispatch<SetStateAction<Date>>; date: Date }) => (
  <Space>
    <SecondaryButton onClick={() => setDate(startOfMonthOffset(date, -1))}>{Messages.budget.prev}</SecondaryButton>
    {formatDateMonth(date)}
    <SecondaryButton onClick={() => setDate(startOfMonthOffset(date, +1))}>{Messages.budget.next}</SecondaryButton>
  </Space>
);

const Budget = observer(() => {
  const { config } = useMoneeeyStore();
  const [startingDate, setStartingDate] = useState(() => startOfMonthOffset(new Date(), 0));
  const [editing, setEditing] = useState<IBudget | undefined>(undefined);

  const viewMonths = config.main?.view_months || 3;
  const viewArchived = config.main?.view_archived === true;

  return (
    <section className='budgetArea'>
      <Space className='control'>
        <MonthDateSelector date={startingDate} setDate={setStartingDate} />
        <div className='divider' />
        {Messages.budget.show_months}
        <Input
          data-test-id='inputViewMonths'
          min={1}
          max={24}
          placeholder={Messages.budget.show_months}
          value={viewMonths}
          onChange={({ target: { value } }) => config.merge({ ...config.main, view_months: parseInt(value, 10) })}
        />
        <Checkbox
          data-test-id='checkboxViewArchived'
          checked={viewArchived}
          onChange={({ target: { checked } }) => config.merge({ ...config.main, view_archived: checked })}>
          {Messages.budget.show_archived}
        </Checkbox>
      </Space>
      <BudgetPeriods
        startingDate={startingDate}
        setEditing={setEditing}
        viewArchived={viewArchived}
        viewMonths={viewMonths}
      />
      <BudgetEditor editing={editing} setEditing={setEditing} />
    </section>
  );
});

export { Budget, Budget as default };
