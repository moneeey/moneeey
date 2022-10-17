import { observer } from 'mobx-react-lite';
import { useState } from 'react';

import { SecondaryButton } from '../components/base/Button';
import Space from '../components/base/Space';
import { TableEditor } from '../components/TableEditor';
import { AccountStore, TAccountUUID } from '../entities/Account';
import CurrencyStore from '../entities/Currency';
import TransactionStore, { ITransaction } from '../entities/Transaction';
import { formatDateMonth, isDateBetween, parseDate, startOfMonthOffset } from '../utils/Date';
import Messages from '../utils/Messages';

interface TransactionSettingsProps {
  transactions: TransactionStore;
  accounts: AccountStore;
  currencies: CurrencyStore;
  schemaFilter: (row: ITransaction) => boolean;
  referenceAccount: TAccountUUID;
}

const TransactionTable = observer(({ transactions, schemaFilter }: TransactionSettingsProps) => {
  const [date, setDate] = useState(startOfMonthOffset(transactions.newest_dt, -4));
  const starting = startOfMonthOffset(date, -2);
  const ending = startOfMonthOffset(date, +2);
  const periodFilter = (row: ITransaction) => isDateBetween(parseDate(row.date), starting, ending);
  const filter = (row: ITransaction) => periodFilter(row) && schemaFilter(row);

  return (
    <section>
      <Space>
        <SecondaryButton onClick={() => setDate(startOfMonthOffset(date, -2))}>{Messages.budget.prev}</SecondaryButton>
        {formatDateMonth(starting)} to {formatDateMonth(ending)}
        <SecondaryButton onClick={() => setDate(startOfMonthOffset(date, +2))}>{Messages.budget.next}</SecondaryButton>
      </Space>
      <TableEditor store={transactions} schemaFilter={filter} factory={transactions.factory} />
    </section>
  );
});

export { TransactionTable, TransactionTable as default };
