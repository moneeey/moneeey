import React from "react";
import "./App.css";
import "antd/dist/antd.css";
import { TMonetary } from "./Entity";
import { TAccountUUID } from "./Account";
import { ITransaction } from "./Transaction";
import { Table } from "antd";
import MoneeeyStore, { MoneeeyProvider } from "./MoneeeyStore";
import {
  SampleAccounts,
  SampleCurrencies,
  SampleTransactions,
} from "./Samples";
import {
  TagsMemo,
  TagsFromAcct,
  TagsToAcct,
  TagsHighlightProvider,
} from "./Tags";

const moneeeyStore = new MoneeeyStore();
const currencyStore = moneeeyStore.currencies;
const accountStore = moneeeyStore.accounts;

SampleCurrencies.forEach((c) => currencyStore.add(c));
SampleAccounts.forEach((a) => accountStore.add(a));

const formatterForAccount = (account_uuid: TAccountUUID) => {
  const account = accountStore.findByUuid(account_uuid);
  return (value: TMonetary) =>
    currencyStore.formatByUuid(account.currency_uuid, value);
};

const transactionValueFormatter = (_value: string, row: ITransaction) => {
  const formatter_to_acct = formatterForAccount(row.to_account);
  if (row.from_value === row.to_value) {
    const color =
      row.to_account === accountStore.getReferenceAccountUuid ? "green" : "red";
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

const accountValueFormatter = (TagsComponent: any) => (
  value: string,
  _row: ITransaction
) => {
  const account = accountStore.findByUuid(value);
  return (
    <span>
      <b>{account.name}</b> <TagsComponent tags={account.tags} />
    </span>
  );
};

const toAccountValueFormatter = accountValueFormatter(TagsToAcct);
const fromAccountValueFormatter = accountValueFormatter(TagsFromAcct);

const memoValueFormatter = (value: string, row: ITransaction) => {
  const from_acct = accountStore.findByUuid(row.from_account);
  const to_acct = accountStore.findByUuid(row.to_account);
  const memo = (value || "") + " ";
  const memo_tags = [...memo.matchAll(/[^#](#\w+)/g)].map((m) =>
    m[1].replace("#", "")
  );
  return (
    <span>
      {memo.replace("##", "#")}
      <TagsMemo tags={memo_tags} />
      <TagsFromAcct tags={from_acct.tags} />
      <TagsToAcct tags={to_acct.tags} />
    </span>
  );
};

const columns = [
  { title: "Date", dataIndex: "date", width: 150 },
  {
    title: "From",
    dataIndex: "from_account",
    width: 300,
    render: fromAccountValueFormatter,
  },
  {
    title: "To",
    dataIndex: "to_account",
    width: 300,
    render: toAccountValueFormatter,
  },
  {
    title: "Value",
    dataIndex: "to_value",
    width: 250,
    render: transactionValueFormatter,
  },
  { title: "Memo", dataIndex: "memo", render: memoValueFormatter },
];

function App(): React.ReactElement {
  const [moneeeyStore] = React.useState(new MoneeeyStore());
  return (
    <div className="App">
      <MoneeeyProvider value={moneeeyStore}>
        {moneeeyStore.navigation.area + " " + moneeeyStore.navigation.detail}
        <TagsHighlightProvider>
          <Table columns={columns} dataSource={SampleTransactions} />
        </TagsHighlightProvider>
      </MoneeeyProvider>
    </div>
  );
}

export default App;
