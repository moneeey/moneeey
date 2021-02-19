import React from "react";
import { TMonetary } from "./Entity";
import { TAccountUUID } from "./Account";
import { ITransaction } from "./Transaction";
import { Button, Space, Table } from "antd";
import MoneeeyStore from "./MoneeeyStore";
import { TagsMemo, TagsFromAcct, TagsToAcct } from "./Tags";
import { DeleteOutlined } from "@ant-design/icons";

const transactionValueFormatter = (moneeeyStore: MoneeeyStore) => (
  _value: string,
  row: ITransaction
) => {
  const formatterForAccount = (account_uuid: TAccountUUID) => {
    const account = moneeeyStore.accounts.byUuid(account_uuid);
    return (value: TMonetary) =>
      moneeeyStore.currencies.formatByUuid(account.currency_uuid, value);
  };

  const formatter_to_acct = formatterForAccount(row.to_account);
  if (row.from_value === row.to_value) {
    const color =
      row.to_account === moneeeyStore.accounts.getReferenceAccountUuid
        ? "green"
        : "red";
    return (
      <span style={{ color: color }}>{formatter_to_acct(row.to_value)}</span>
    );
  }
  const formatter_from_acct = formatterForAccount(row.from_account);
  return (
    formatter_from_acct(row.from_value) +
    " -> " +
    formatter_to_acct(row.to_value)
  );
};

const accountValueFormatter = (
  TagsComponent: any,
  moneeeyStore: MoneeeyStore
) => (value: string, _row: ITransaction) => {
  const account = moneeeyStore.accounts.byUuid(value);
  return (
    <>
      <b>{account.name}</b> <TagsComponent tags={account.tags} />
    </>
  );
};

const toAccountValueFormatter = (m: MoneeeyStore) =>
  accountValueFormatter(TagsToAcct, m);
const fromAccountValueFormatter = (m: MoneeeyStore) =>
  accountValueFormatter(TagsFromAcct, m);

function TransactionRowControls({
  row,
  moneeeyStore,
}: {
  row: ITransaction;
  moneeeyStore: MoneeeyStore;
}) {
  const [deleting, setDeleting] = React.useState(false);
  const [deletingTimeout, setDeletingTimeout] = React.useState(null as any);
  return (
    <div className="transactionRowControls">
      {!deleting ? (
        <Button shape="circle">
          <DeleteOutlined
            onClick={() => {
              const timeout = setTimeout(() => setDeleting(false), 5000);
              setDeletingTimeout(() => clearTimeout(timeout));
              setDeleting(true);
            }}
          />
        </Button>
      ) : (
        <Space>
          <Button danger shape="circle">
            <DeleteOutlined
              onClick={() => {
                if (deletingTimeout) deletingTimeout();
                moneeeyStore.transactions.remove(row);
                setDeleting(false);
              }}
            />
          </Button>
          <Button onClick={() => setDeleting(false)}>Cancel</Button>
        </Space>
      )}
    </div>
  );
}

const memoValueFormatter = (moneeeyStore: MoneeeyStore) => (
  value: string,
  row: ITransaction
) => {
  const from_acct = moneeeyStore.accounts.byUuid(row.from_account);
  const to_acct = moneeeyStore.accounts.byUuid(row.to_account);
  const memo = (value || "") + " ";
  const memo_tags = [...memo.matchAll(/[^#](#\w+)/g)].map((m) =>
    m[1].replace("#", "")
  );
  return (
    <>
      {memo.replace("##", "#")}
      <TagsMemo tags={memo_tags} />
      <TagsFromAcct tags={from_acct.tags} />
      <TagsToAcct tags={to_acct.tags} />
      <TransactionRowControls row={row} moneeeyStore={moneeeyStore} />
    </>
  );
};

const buildColumns = (moneeeyStore: MoneeeyStore) => [
  { title: "Date", dataIndex: "date", width: 150 },
  {
    title: "From",
    dataIndex: "from_account",
    width: 300,
    render: fromAccountValueFormatter(moneeeyStore),
  },
  {
    title: "To",
    dataIndex: "to_account",
    width: 300,
    render: toAccountValueFormatter(moneeeyStore),
  },
  {
    title: "Value",
    dataIndex: "to_value",
    width: 250,
    render: transactionValueFormatter(moneeeyStore),
  },
  {
    title: "Memo",
    dataIndex: "memo",
    render: memoValueFormatter(moneeeyStore),
  },
];

export default function TransactionTable({
  moneeeyStore,
  transactions,
}: {
  moneeeyStore: MoneeeyStore;
  transactions: ITransaction[];
}): React.ReactElement {
  return (
    <Table
      columns={buildColumns(moneeeyStore)}
      dataSource={transactions}
      pagination={false}
    />
  );
}
