import { DeleteOutlined } from '@ant-design/icons';
import { Button, Popconfirm, Table } from 'antd';
import React from 'react';

import { AccountRoute } from '../routes/AccountRoute';
import { TAccountUUID } from '../shared/Account';
import { compareDates, formatDateAs } from '../shared/Date';
import { TMonetary } from '../shared/Entity';
import MoneeeyStore from '../shared/MoneeeyStore';
import { ITransaction } from '../shared/Transaction';
import useMoneeeyStore from '../useMoneeeyStore';
import { TagsFromAcct, TagsMemo, TagsToAcct } from './Tags';

function TransactionRowControls({ row, moneeeyStore }: { row: ITransaction; moneeeyStore: MoneeeyStore }) {
  return (
    <div className='transactionRowControls'>
      <Popconfirm title='Delete?' onConfirm={() => moneeeyStore.transactions.remove(row)}>
        <Button shape='circle'>
          <DeleteOutlined />
        </Button>
      </Popconfirm>
    </div>
  );
}

const accountValueFormatter =
  (TagsComponent: any, moneeeyStore: MoneeeyStore) => (value: string, _row: ITransaction) => {
    const account = moneeeyStore.accounts.byUuid(value);
    if (!account) return;
    return (
      <>
        <Button
          type='link'
          onClick={(e) => {
            e.preventDefault();
            moneeeyStore.navigation.navigate(AccountRoute.accountUrl(account));
          }}>
          {account.name}
        </Button>{' '}
        <TagsComponent tags={account.tags} />
      </>
    );
  };

const buildColumns = (moneeeyStore: MoneeeyStore, referenceAccount: TAccountUUID) => [
  {
    title: 'Date',
    dataIndex: 'date',
    width: 150,
    render: (date: string) => formatDateAs(date, moneeeyStore.navigation.dateFormat),
    sorter: (a: ITransaction, b: ITransaction) => compareDates(a.date, b.date)
  },
  {
    title: 'From',
    dataIndex: 'from_account',
    width: 360,
    render: accountValueFormatter(TagsFromAcct, moneeeyStore),
    sorter: true
  },
  {
    title: 'To',
    dataIndex: 'to_account',
    width: 360,
    render: accountValueFormatter(TagsToAcct, moneeeyStore),
    sorter: true
  },
  {
    title: 'Memo',
    dataIndex: 'memo',
    render: (value: string, row: ITransaction) => {
      const from_acct = moneeeyStore.accounts.byUuid(row.from_account);
      const to_acct = moneeeyStore.accounts.byUuid(row.to_account);
      if (!from_acct || !to_acct) return;
      const memo = (value || '') + ' ';
      const tags = Array.from(memo.matchAll(/[^#](#\w+)/g));
      const memo_tags = [...tags].map((m) => m[1].replace('#', ''));
      return (
        <>
          {memo.replace('##', '#')}
          <TagsMemo tags={memo_tags} />
          <TagsFromAcct tags={from_acct.tags} />
          <TagsToAcct tags={to_acct.tags} />
        </>
      );
    }
  },
  {
    title: 'Value',
    dataIndex: 'to_value',
    width: 320,
    sorter: (a: ITransaction, b: ITransaction) => a.to_value - b.to_value,
    render: (_value: string, row: ITransaction) => {
      const formatterForAccount = (account_uuid: TAccountUUID) => {
        return (value: TMonetary) => {
          const acct = moneeeyStore.accounts.byUuid(account_uuid);
          if (acct) {
            return moneeeyStore.currencies.formatByUuid(acct.currency_uuid, value);
          } else {
            return value;
          }
        };
      };

      let value;
      const formatter_to_acct = formatterForAccount(row.to_account);
      if (row.from_value === row.to_value) {
        const color = row.to_account === referenceAccount ? 'green' : 'red';
        value = <span style={{ color: color }}>{formatter_to_acct(row.to_value)}</span>;
      } else {
        const formatter_from_acct = formatterForAccount(row.from_account);
        value = formatter_from_acct(row.from_value) + ' -> ' + formatter_to_acct(row.to_value);
      }
      return (
        <>
          {value}
          <TransactionRowControls moneeeyStore={moneeeyStore} row={row} />
        </>
      );
    }
  }
];

export default function TransactionTable({
  transactions,
  referenceAccount
}: {
  transactions: ITransaction[];
  referenceAccount: TAccountUUID;
}): React.ReactElement {
  const moneeeyStore = useMoneeeyStore();
  return (
    <Table
      className='transactionTable'
      columns={buildColumns(moneeeyStore, referenceAccount)}
      dataSource={transactions}
      pagination={false}
    />
  );
}
