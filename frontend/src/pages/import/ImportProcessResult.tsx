import { compact, isEmpty, isNumber, map } from 'lodash';
import { Dispatch, SetStateAction } from 'react';

import { PrimaryButton, SecondaryButton } from '../../components/base/Button';
import Space from '../../components/base/Space';
import { TextDanger, TextNormal } from '../../components/base/Text';
import { AccountSelector } from '../../components/editor/AccountEditor';
import VirtualTable, { Row } from '../../components/VirtualTableEditor';
import { TAccountUUID } from '../../entities/Account';
import { ITransaction } from '../../entities/Transaction';
import { ImportResult, ImportTask } from '../../shared/import/ImportContent';
import MoneeeyStore from '../../shared/MoneeeyStore';
import useMoneeeyStore from '../../shared/useMoneeeyStore';
import Messages from '../../utils/Messages';

const accountRender =
  ({
    field,
    referenceAccount,
    moneeeyStore,
    transactions,
    result,
    setResult,
  }: {
    field: string;
    referenceAccount: TAccountUUID;
    moneeeyStore: MoneeeyStore;
    transactions: ITransaction[];
    result: ImportResult;
    setResult: Dispatch<SetStateAction<ImportResult>>;
  }) =>
  (row: Row) =>
    changedRender({
      row,
      field,
      cell: (function AccountRenderer() {
        const transaction = transactions.find((t) => t.transaction_uuid === row.entityId);
        if (!transaction) {
          return <span />;
        }
        const account_uuid = transaction[field];

        if (referenceAccount === account_uuid) {
          return <span>{moneeeyStore.accounts.nameForUuid(account_uuid)}</span>;
        }

        return (
          <AccountSelector
            clearable
            title='Account'
            account={account_uuid as string}
            accounts={compact([
              ...map(result?.recommended_accounts[transaction.transaction_uuid], (cur_account_uuid) =>
                moneeeyStore.accounts.byUuid(cur_account_uuid)
              ),
              ...map(moneeeyStore.accounts.all),
            ])}
            onSelect={(new_account_uuid: TAccountUUID) =>
              setResult({
                ...result,
                transactions: map(result?.transactions, (t) =>
                  t.transaction_uuid === transaction.transaction_uuid ? { ...t, [field]: new_account_uuid } : t
                ),
              })
            }
          />
        );
      })(),
      moneeeyStore,
      transactions,
    });

const changedRender = ({
  row,
  cell,
  field,
  moneeeyStore,
  transactions,
}: {
  row: Row;
  cell: JSX.Element;
  field: string;
  moneeeyStore: MoneeeyStore;
  transactions: ITransaction[];
}) => {
  let mode = 'New';
  let title = mode;
  if (field) {
    const isAccountColumn = field.indexOf('_account') > 0;
    const original = moneeeyStore.transactions.byUuid(row.entityId || '');
    if (original) {
      const originalValue = original[field];
      const cellValue = transactions.find((t) => t.transaction_uuid === row.entityId)?.[field];
      if (!isEmpty(originalValue) || isNumber(originalValue)) {
        const format = (value: unknown) =>
          isAccountColumn ? moneeeyStore.accounts.nameForUuid(value as string) : (value as string);
        const originalFormattedValue = format(originalValue);
        const newFormattedValue = format(cellValue);
        const changed = originalFormattedValue !== newFormattedValue;
        if (changed) {
          mode = Messages.import.updated;
          title = Messages.import.changed_description(originalFormattedValue, newFormattedValue);
        } else {
          mode = Messages.import.unchanged;
          title = Messages.import.unchanged;
        }
      }
    }
  }

  return (
    <span className={`import${mode}`} title={title}>
      {cell} {mode === 'Updated' ? <span className='newTag'>{mode}</span> : false}
    </span>
  );
};

const fieldRender = ({
  field,
  transactions,
  moneeeyStore,
}: {
  field: string;
  transactions: ITransaction[];
  moneeeyStore: MoneeeyStore;
}) =>
  function FieldRender(row: Row) {
    return changedRender({
      row,
      field,
      cell: <>{transactions.find((t) => t.transaction_uuid === row.entityId)?.[field]}</>,
      moneeeyStore,
      transactions,
    });
  };

const ContentTransactionTable = ({
  moneeeyStore,
  transactions,
  task,
  result,
  setResult,
}: {
  moneeeyStore: MoneeeyStore;
  transactions: ITransaction[];
  task: ImportTask;
  result: ImportResult;
  setResult: Dispatch<SetStateAction<ImportResult>>;
}) =>
  isEmpty(transactions) ? null : (
    <VirtualTable
      className='tableEditor'
      rows={transactions.map((t) => ({ entityId: t.transaction_uuid }))}
      columns={[
        {
          index: 0,
          width: 120,
          title: Messages.util.date,
          render: fieldRender({ field: 'date', transactions, moneeeyStore }),
        },
        {
          index: 1,
          width: 280,
          title: Messages.transactions.from_account,
          render: accountRender({
            moneeeyStore,
            referenceAccount: task.config.referenceAccount,
            field: 'from_account',
            transactions,
            result,
            setResult,
          }),
        },
        {
          index: 2,
          width: 280,
          title: Messages.transactions.to_account,
          render: accountRender({
            moneeeyStore,
            referenceAccount: task.config.referenceAccount,
            transactions,
            field: 'to_account',
            result,
            setResult,
          }),
        },
        {
          index: 3,
          width: 120,
          title: Messages.transactions.amount,
          render: fieldRender({
            field: 'from_value',
            transactions,
            moneeeyStore,
          }),
        },
        {
          index: 5,
          title: Messages.transactions.memo,
          render: fieldRender({ field: 'memo', transactions, moneeeyStore }),
        },
      ]}
    />
  );

const ImportProcessResult = ({
  task,
  result,
  setResult,
  close,
}: {
  task: ImportTask;
  result: ImportResult;
  setResult: Dispatch<SetStateAction<ImportResult>>;
  close: () => void;
}) => {
  const moneeeyStore = useMoneeeyStore();

  const onImport = () => {
    result.transactions.forEach((t) => moneeeyStore.transactions.merge(t));
    close();
  };

  const onInvertFromTo = () => {
    setResult({
      ...result,
      transactions: result.transactions.map((t) => {
        const { from_account, to_account } = t;

        return { ...t, from_account: to_account, to_account: from_account };
      }),
    });
  };

  return (
    <>
      {map(result.errors, (err) => (
        <p>
          <TextDanger key={err.description}>
            {err.data} {err.description}
          </TextDanger>
        </p>
      ))}
      <p>
        <TextNormal>{Messages.import.success(task.input.name)}</TextNormal>
      </p>
      <Space>
        <SecondaryButton onClick={close}>{Messages.util.close}</SecondaryButton>
        <PrimaryButton onClick={onImport}>{Messages.import.import_transactions}</PrimaryButton>
        <SecondaryButton onClick={onInvertFromTo}>{Messages.import.invert_from_to_accounts}</SecondaryButton>
      </Space>
      <ContentTransactionTable
        moneeeyStore={moneeeyStore}
        task={task}
        transactions={[
          ...result.transactions.filter((t) => result.update[t.transaction_uuid]),
          ...result.transactions.filter((t) => !result.update[t.transaction_uuid]),
        ]}
        result={result}
        setResult={setResult}
      />
    </>
  );
};

export { ImportProcessResult, ImportProcessResult as default };
