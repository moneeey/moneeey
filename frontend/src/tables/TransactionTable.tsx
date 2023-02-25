import { observer } from 'mobx-react-lite';
import { useState } from 'react';

import { SecondaryButton } from '../components/base/Button';
import Space from '../components/base/Space';
import TableEditor from '../components/TableEditor';
import { TAccountUUID } from '../entities/Account';
import TransactionStore, { ITransaction } from '../entities/Transaction';
import { formatDate, formatDateMonth, isDateBetween, parseDate, startOfMonthOffset } from '../utils/Date';
import Messages from '../utils/Messages';

interface TransactionSettingsProps {
  transactions: TransactionStore;
  schemaFilter: (row: ITransaction) => boolean;
  referenceAccount: TAccountUUID;
}

const TransactionTable = observer(({ transactions, schemaFilter, referenceAccount }: TransactionSettingsProps) => {
  const [date, setDate] = useState(startOfMonthOffset(transactions.newest_dt, -1));
  const starting = startOfMonthOffset(date, -2);
  const ending = startOfMonthOffset(date, +2);
  const periodFilter = (row: ITransaction) => isDateBetween(parseDate(row.date), starting, ending);
  const filter = (row: ITransaction) => periodFilter(row) && schemaFilter(row);

  return (
    <section>
      <Space>
        <SecondaryButton onClick={() => setDate(startOfMonthOffset(date, -2))}>{Messages.budget.prev}</SecondaryButton>
        <span>
          {formatDateMonth(starting)} to {formatDateMonth(ending)}
        </span>
        <SecondaryButton onClick={() => setDate(startOfMonthOffset(date, +2))}>{Messages.budget.next}</SecondaryButton>
      </Space>
      <TableEditor
        data-test-id={`transactionTable_${formatDate(starting)}_${formatDate(ending)}`}
        store={transactions}
        schemaFilter={filter}
        factory={transactions.factory}
        context={{ referenceAccount }}
      />
    </section>
  );
});

export { TransactionTable, TransactionTable as default };
