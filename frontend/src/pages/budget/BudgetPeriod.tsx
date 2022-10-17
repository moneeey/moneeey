import { PlusCircleFilled } from '@ant-design/icons';
import { map, range } from 'lodash';
import { observer } from 'mobx-react-lite';
import { Dispatch, SetStateAction, useEffect, useMemo, useState } from 'react';

import { LinkButton } from '../../components/base/Button';
import Card from '../../components/base/Card';
import { TextNormal } from '../../components/base/Text';
import Loading from '../../components/Loading';
import { TableEditor } from '../../components/TableEditor';
import { IBudget } from '../../entities/Budget';
import { BudgetEnvelope } from '../../entities/BudgetEnvelope';
import useMoneeeyStore from '../../shared/useMoneeeyStore';
import { formatDate, formatDateMonth, startOfMonthOffset } from '../../utils/Date';
import Messages from '../../utils/Messages';

interface PeriodProps {
  startingDate: Date;
  setEditing: Dispatch<SetStateAction<IBudget | undefined>>;
  viewArchived: boolean;
}

const BudgetPeriods = observer(
  ({ startingDate, setEditing, viewArchived, viewMonths }: PeriodProps & { viewMonths: number }) => {
    const [progress, setProgress] = useState(0);

    return (
      <Loading loading={progress !== 0 && progress !== 100} progress={progress}>
        <div className='periods'>
          {map(range(0, viewMonths), (offset) => (
            <BudgetPeriod
              key={offset}
              startingDate={startOfMonthOffset(startingDate, offset)}
              setEditing={setEditing}
              viewArchived={viewArchived}
              setProgress={setProgress}
            />
          ))}
        </div>
      </Loading>
    );
  }
);

interface BudgetPeriodProps extends PeriodProps {
  setProgress: Dispatch<SetStateAction<number>>;
}

const BudgetPeriod = observer(({ startingDate, setEditing, viewArchived, setProgress }: BudgetPeriodProps) => {
  const { budget } = useMoneeeyStore();
  const starting = useMemo(() => formatDate(startingDate), [startingDate]);

  useEffect(() => {
    budget.makeEnvelopes(starting, (currentProgress) => setProgress(currentProgress));
  }, [starting, budget.ids]);
  const onNewBudget = () => setEditing(budget.factory());

  return (
    <Card
      data-test-id={`budget_period_${formatDateMonth(startingDate)}`}
      className='period'
      header={
        <span className='periodTitle'>
          <TextNormal>{formatDateMonth(startingDate)}</TextNormal>
          <LinkButton onClick={onNewBudget}>
            <PlusCircleFilled style={{ color: 'lightgreen' }} />
            {Messages.budget.new}
          </LinkButton>
        </span>
      }>
      <TableEditor
        data-test-id={`budget_period_table_${formatDateMonth(startingDate)}`}
        store={budget.envelopes}
        factory={budget.envelopes.factory}
        creatable={false}
        schemaFilter={(b) => b.starting === starting && (!b.budget.archived || viewArchived)}
        context={{ name: (env: BudgetEnvelope) => setEditing(env.budget) }}
      />
    </Card>
  );
});

export default BudgetPeriods;
