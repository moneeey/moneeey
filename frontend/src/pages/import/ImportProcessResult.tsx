import { compact, isEmpty, isNumber, map } from 'lodash';
import { Dispatch, SetStateAction } from 'react';

import { PrimaryButton, SecondaryButton } from '../../components/base/Button';
import Space from '../../components/base/Space';
import { TextDanger, TextNormal } from '../../components/base/Text';
import { AccountSelector } from '../../components/editor/AccountEditor';
import VirtualTable, { ColumnDef } from '../../components/VirtualTableEditor';
import { TAccountUUID } from '../../entities/Account';
import { ITransaction } from '../../entities/Transaction';
import { ImportResult, ImportTask } from '../../shared/import/ImportContent';
import MoneeeyStore from '../../shared/MoneeeyStore';
import useMoneeeyStore from '../../shared/useMoneeeyStore';
import Messages from '../../utils/Messages';

const accountRender = ({
  field,
  referenceAccount,
  moneeeyStore,
  result,
  setResult,
}: {
  field: string;
  referenceAccount: TAccountUUID;
  moneeeyStore: MoneeeyStore;
  result: ImportResult;
  setResult: Dispatch<SetStateAction<ImportResult>>;
}) =>
  function AccountRenderer(account_uuid: unknown, row: ITransaction) {
    if (referenceAccount === account_uuid) {
      return <span>{moneeeyStore.accounts.nameForUuid(account_uuid)}</span>;
    }

    return (
      <AccountSelector
        clearable
        title='Account'
        account={account_uuid as string}
        accounts={compact([
          ...map(result?.recommended_accounts[row.transaction_uuid], (cur_account_uuid) =>
            moneeeyStore.accounts.byUuid(cur_account_uuid)
          ),
          ...map(moneeeyStore.accounts.all),
        ])}
        onSelect={(new_account_uuid: TAccountUUID) =>
          setResult({
            ...result,
            transactions: map(result?.transactions, (t) =>
              t.transaction_uuid === row.transaction_uuid ? { ...t, [field]: new_account_uuid } : t
            ),
          })
        }
      />
    );
  };

const rendererForCol = (col: ColumnDef<ITransaction>, moneeeyStore: MoneeeyStore) =>
  function ColumnRenderer(cellValue: unknown, row: ITransaction) {
    let mode = 'New';
    let title = mode;
    const field = col.fieldName as string;
    if (field) {
      const isAccountColumn = field.indexOf('_account') > 0;
      const original = moneeeyStore.transactions.byUuid(row.transaction_uuid);
      if (original) {
        const originalValue = original[field];
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

    const cell = col.render ? col.render(cellValue, row) : cellValue;

    return (
      <span className={`import${mode}`} title={title}>
        <>
          {cell} {mode === 'Updated' ? <span className='newTag'>{mode}</span> : false}
        </>
      </span>
    );
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
      rows={transactions}
      columns={[
        { fieldName: 'date', title: Messages.util.date, render: (value: string) => <>{value}</> },
        {
          fieldName: 'from_account',
          title: Messages.transactions.from_account,
          render: accountRender({
            moneeeyStore,
            referenceAccount: task.config.referenceAccount,
            field: 'from_account',
            result,
            setResult,
          }),
        },
        {
          fieldName: 'to_account',
          title: Messages.transactions.to_account,
          render: accountRender({
            moneeeyStore,
            referenceAccount: task.config.referenceAccount,
            field: 'to_account',
            result,
            setResult,
          }),
        },
        { fieldName: 'memo', title: Messages.transactions.memo },
        { fieldName: 'from_value', title: Messages.transactions.amount },
      ].map((col) => ({
        ...col,
        render: rendererForCol(col, moneeeyStore),
      }))}
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

  return (
    <>
      {map(result.errors, (err) => (
        <p>
          <TextDanger key={err.description}>
            {err.data} {err.description}
          </TextDanger>
        </p>
      ))}
      <TextNormal>{Messages.import.success(task.input.name)}</TextNormal>
      <ContentTransactionTable
        moneeeyStore={moneeeyStore}
        task={task}
        transactions={result.transactions.filter((t) => result.update[t.transaction_uuid])}
        result={result}
        setResult={setResult}
      />
      <ContentTransactionTable
        moneeeyStore={moneeeyStore}
        task={task}
        transactions={result.transactions.filter((t) => !result.update[t.transaction_uuid])}
        result={result}
        setResult={setResult}
      />
      <Space>
        <SecondaryButton onClick={close}>{Messages.util.close}</SecondaryButton>
        <PrimaryButton onClick={onImport}>{Messages.import.import_transactions}</PrimaryButton>
      </Space>
    </>
  );
};

export { ImportProcessResult, ImportProcessResult as default };
