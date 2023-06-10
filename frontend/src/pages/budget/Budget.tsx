import { observer } from 'mobx-react';
import { Dispatch, SetStateAction, useState } from 'react';

import { SecondaryButton } from '../../components/base/Button';
import { Checkbox, InputNumber } from '../../components/base/Input';
import Space, { VerticalSpace } from '../../components/base/Space';
import { IBudget } from '../../entities/Budget';
import useMoneeeyStore from '../../shared/useMoneeeyStore';
import { formatDateMonth, startOfMonthOffset } from '../../utils/Date';
import Messages from '../../utils/Messages';

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
    <VerticalSpace>
      <MonthDateSelector date={startingDate} setDate={setStartingDate} />
      <Space>
        {Messages.budget.show_months}
        <InputNumber
          data-test-id='inputViewMonths'
          placeholder={Messages.budget.show_months}
          value={viewMonths}
          thousandSeparator={config.main.thousand_separator}
          decimalSeparator={config.main.decimal_separator}
          decimalScale={0}
          onChange={(value: number | null) =>
            config.merge({ ...config.main, view_months: Math.min(Math.max(value || 3, 0), 12) })
          }
        />
        <Checkbox
          data-test-id='checkboxViewArchived'
          value={viewArchived}
          onChange={(view_archived) => config.merge({ ...config.main, view_archived })}
          placeholder={Messages.budget.show_archived}>
          {Messages.budget.show_archived}
        </Checkbox>
      </Space>
      <BudgetPeriods
        startingDate={startingDate}
        setEditing={setEditing}
        viewArchived={viewArchived}
        viewMonths={viewMonths}
      />
      {editing && <BudgetEditor editing={editing} setEditing={setEditing} />}
    </VerticalSpace>
  );
});

export { Budget, Budget as default };
