/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable react/display-name */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Table } from 'antd';
import { compact, identity, isEmpty, isNumber, map } from 'lodash';
import { Dispatch, SetStateAction } from 'react';

import { PrimaryButton, SecondaryButton } from '../../components/base/Button';
import Space from '../../components/base/Space';
import { TextDanger, TextNormal, TextSuccess } from '../../components/base/Text';
import { AccountSelector } from '../../components/editor/AccountEditor';
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
    result,
    setResult,
  }: {
    field: string;
    referenceAccount: TAccountUUID;
    moneeeyStore: MoneeeyStore;
    result: ImportResult;
    setResult: Dispatch<SetStateAction<ImportResult>>;
  }) =>
  (account_uuid: TAccountUUID, row: ITransaction) => {
    if (referenceAccount === account_uuid) {
      return <span>{moneeeyStore.accounts.nameForUuid(account_uuid)}</span>;
    }

    return (
      <AccountSelector
        clearable
        title='Account'
        account={account_uuid}
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
    <Table
      className='tableEditor'
      dataSource={transactions}
      rowKey='transaction_uuid'
      pagination={false}
      columns={[
        { dataIndex: 'date', title: Messages.util.date },
        {
          dataIndex: 'from_account',
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
          dataIndex: 'to_account',
          title: Messages.transactions.to_account,
          render: accountRender({
            moneeeyStore,
            referenceAccount: task.config.referenceAccount,
            field: 'to_account',
            result,
            setResult,
          }),
        },
        { dataIndex: 'memo', title: Messages.transactions.memo },
        { dataIndex: 'from_value', title: Messages.transactions.amount },
      ].map((col) => ({
        ...col,
        render: (cellValue: any, row: ITransaction) => {
          let mode = 'New';
          let title = mode;
          if (col.dataIndex) {
            const original = moneeeyStore.transactions.byUuid(row.transaction_uuid);
            if (original) {
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
              const originalValue = (original as Record<string, any>)[col.dataIndex];
              if (!isEmpty(originalValue) || isNumber(originalValue)) {
                const format = (value: string) =>
                  col.dataIndex.indexOf('_account') > 0 ? moneeeyStore.accounts.nameForUuid(value) : `${value}`;
                const changed = format(originalValue) !== format(cellValue);
                if (changed) {
                  mode = Messages.import.updated;
                  title = Messages.import.changed_description(format(originalValue), format(cellValue));
                } else {
                  mode = Messages.import.unchanged;
                  title = Messages.import.unchanged;
                }
              }
            }
          }
          const cell = (col.render || identity)(cellValue, row);

          return (
            <span className={`import${mode}`} title={title}>
              <>
                {cell} {mode === 'Updated' ? <span className='newTag'>{mode}</span> : false}
              </>
            </span>
          );
        },
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
