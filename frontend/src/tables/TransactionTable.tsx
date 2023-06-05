import { observer } from 'mobx-react-lite';

import TableEditor from '../components/TableEditor';
import { TAccountUUID } from '../entities/Account';
import TransactionStore, { ITransaction } from '../entities/Transaction';

interface TransactionSettingsProps {
  creatable?: boolean;
  transactions: TransactionStore;
  schemaFilter: (row: ITransaction) => boolean;
  referenceAccount: TAccountUUID;
}

const TransactionTable = observer(
  ({ creatable, transactions, schemaFilter, referenceAccount }: TransactionSettingsProps) => {
    return (
      <TableEditor
        creatable={creatable}
        data-test-id={`transactionTable`}
        store={transactions}
        schemaFilter={(row: ITransaction) => schemaFilter(row)}
        factory={transactions.factory}
        context={{ referenceAccount }}
      />
    );
  }
);

export { TransactionTable, TransactionTable as default };
