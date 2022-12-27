import { observer } from 'mobx-react';
import { Dispatch, SetStateAction, useState } from 'react';

import { SecondaryButton } from '../../components/base/Button';
import { Checkbox, Input, InputNumber } from '../../components/base/Input';
import Space from '../../components/base/Space';
import { IBudget } from '../../entities/Budget';
import useMoneeeyStore from '../../shared/useMoneeeyStore';
import { formatDateMonth, startOfMonthOffset } from '../../utils/Date';
import Messages from '../../utils/Messages';

import './Budget.less';
import BudgetEditor from './BudgetEditor';
import BudgetPeriods from './BudgetPeriod';

const MonthDateSelector = ({ setDate, date }: { setDate: Dispatch<SetStateAction<Date>>; date: Date }) => (
  <Space>
    <SecondaryButton onClick={() => setDate(startOfMonthOffset(date, -1))}>{Messages.budget.prev}</SecondaryButton>
    <span>{formatDateMonth(date)}</span>
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
        <div>
          {Messages.budget.show_months}
          <InputNumber
            data-test-id='inputViewMonths'
            step={1}
            min={1}
            max={24}
            placeholder={Messages.budget.show_months}
            value={viewMonths}
            onChange={(value: number | null) => config.merge({ ...config.main, view_months: value || 3 })}
          />
        </div>
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
