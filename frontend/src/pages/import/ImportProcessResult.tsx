import { compact, isEmpty, isNumber, map } from 'lodash';
import { Dispatch, SetStateAction } from 'react';

import { PrimaryButton, SecondaryButton } from '../../components/base/Button';
import Space, { VerticalSpace } from '../../components/base/Space';
import { TextDanger, TextNormal } from '../../components/base/Text';
import AccountField from '../../components/editor/AccountField';
import { FieldDef } from '../../components/editor/FieldDef';
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
    field: keyof ITransaction;
    referenceAccount: TAccountUUID;
    moneeeyStore: MoneeeyStore;
    transactions: ITransaction[];
    result: ImportResult;
    setResult: Dispatch<SetStateAction<ImportResult>>;
  }) =>
  (row: Row) =>
    changedRender({
      moneeeyStore,
      transactions,
      row,
      field,
      cell: ({ isChanged, isNew }) => {
        const transaction = transactions.find((t) => t.transaction_uuid === row.entityId);
        if (!transaction) {
          return <span />;
        }
        const account_uuid = transaction[field];

        if (referenceAccount === account_uuid && transaction.from_account !== transaction.to_account) {
          return <span>{moneeeyStore.accounts.nameForUuid(account_uuid)}</span>;
        }

        let clz = '';
        if (isChanged) {
          clz = 'mn-select-changed';
        }
        if (isNew) {
          clz = 'mn-select-new';
        }

        const accountSelectorField = AccountField<ITransaction>({
          read: (entity) => entity[field] as TAccountUUID,
          delta: (selected_account_uuid) => ({ [field]: selected_account_uuid }),
          clearable: true,
          readOptions: () =>
            compact([
              ...map(result?.recommended_accounts[transaction.transaction_uuid], (cur_account_uuid) =>
                moneeeyStore.accounts.byUuid(cur_account_uuid)
              ),
              ...map(moneeeyStore.accounts.all),
            ]),
        });

        return (
          <div className={clz}>
            <accountSelectorField.render
              entity={transaction}
              field={{ title: 'Account' } as FieldDef<ITransaction>}
              isError={false}
              commit={(updated_transaction) => {
                setResult({
                  ...result,
                  transactions: map(result?.transactions, (t) =>
                    t.transaction_uuid === transaction.transaction_uuid ? updated_transaction : t
                  ),
                });
              }}
            />
          </div>
        );
      },
    });

const changedRender = ({
  row,
  cell,
  field,
  moneeeyStore,
  transactions,
}: {
  row: Row;
  cell: (props: { isChanged: boolean; isNew: boolean }) => JSX.Element;
  field: keyof ITransaction;
  moneeeyStore: MoneeeyStore;
  transactions: ITransaction[];
}) => {
  let isChanged = false;
  let isNew = true;
  let color = 'text-green-200';
  let title = Messages.import.new;
  if (field) {
    const isAccountColumn = (field as string).indexOf('_account') > 0;
    const original = moneeeyStore.transactions.byUuid(row.entityId || '');
    if (original) {
      const originalValue = original[field];
      const cellValue = transactions.find((t) => t.transaction_uuid === row.entityId)?.[field];
      if (!isEmpty(originalValue) || isNumber(originalValue)) {
        const format = (value: unknown) =>
          isAccountColumn ? moneeeyStore.accounts.nameForUuid(value as string) : (value as string);
        const originalFormattedValue = format(originalValue);
        const newFormattedValue = format(cellValue);
        isChanged = originalFormattedValue !== newFormattedValue;
        if (isChanged) {
          title = Messages.import.changed_description(originalFormattedValue, newFormattedValue);
          color = 'text-orange-200';
          isNew = false;
        } else {
          title = Messages.import.unchanged;
          color = 'text-white';
          isNew = false;
        }
      }
    }
  }

  return (
    <span className={`flex flex-row items-center ${color}`} title={title}>
      <span className='grow'>{cell({ isChanged, isNew })}</span>
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
      cell: () => <>{transactions.find((t) => t.transaction_uuid === row.entityId)?.[field]}</>,
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
      rows={transactions.map((t) => ({ entityId: t.transaction_uuid }))}
      columns={[
        {
          index: 0,
          width: 100,
          title: Messages.util.date,
          render: fieldRender({ field: 'date', transactions, moneeeyStore }),
        },
        {
          index: 1,
          width: 200,
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
          width: 200,
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
          width: 300,
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
    <VerticalSpace className='h-full grow'>
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
        <PrimaryButton onClick={onImport}>{Messages.import.import_transactions}</PrimaryButton>
        <SecondaryButton onClick={onInvertFromTo}>{Messages.import.invert_from_to_accounts}</SecondaryButton>
        <SecondaryButton onClick={close}>{Messages.util.cancel}</SecondaryButton>
      </Space>
      <div className='grow'>
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
      </div>
    </VerticalSpace>
  );
};

export { ImportProcessResult, ImportProcessResult as default };
