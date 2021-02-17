import React from "react";
import "./App.css";
import "antd/dist/antd.css";
import { EntityType, generateUuid, TMonetary } from "./Entity";
import { TAccountUUID, AccountType, AccountStore } from "./Account";
import { ITransaction } from "./Transaction";
import { CurrencyStore } from "./Currency";
import { Table, Tag } from "antd";

const currencyStore = new CurrencyStore();
const accountStore = new AccountStore();

currencyStore.add({
  entity_type: EntityType.CURRENCY,
  currency_uuid: generateUuid(),
  name: "Brazillian Real",
  short: "BRL",
  prefix: "R$ ",
  suffix: "",
  tags: [],
});
currencyStore.add({
  entity_type: EntityType.CURRENCY,
  currency_uuid: generateUuid(),
  name: "Bitcoin",
  short: "BTC",
  prefix: "",
  suffix: " BTC",
  tags: [],
});

const Accounts = [
  {
    entity_type: EntityType.ACCOUNT,
    account_uuid: generateUuid(),
    name: "MoneeeyBank",
    currency_uuid: currencyStore.findUuidByName("BRL"),
    created: "2020-02-15",
    type: AccountType.CHECKING,
    tags: [],
  },
  {
    entity_type: EntityType.ACCOUNT,
    account_uuid: generateUuid(),
    name: "MyEmployee",
    currency_uuid: currencyStore.findUuidByName("BRL"),
    created: "2020-02-15",
    type: AccountType.PAYEE,
    tags: ["tax"],
  },
  {
    entity_type: EntityType.ACCOUNT,
    account_uuid: generateUuid(),
    name: "SuperGroceriesMarket",
    currency_uuid: currencyStore.findUuidByName("BRL"),
    created: "2020-02-15",
    type: AccountType.PAYEE,
    tags: ["groceries"],
  },
  {
    entity_type: EntityType.ACCOUNT,
    account_uuid: generateUuid(),
    name: "CoffeShop",
    currency_uuid: currencyStore.findUuidByName("BRL"),
    created: "2020-02-15",
    type: AccountType.PAYEE,
    tags: ["health", "tax"],
  },
  {
    entity_type: EntityType.ACCOUNT,
    account_uuid: generateUuid(),
    name: "BTC-Wallet",
    currency_uuid: currencyStore.findUuidByName("BTC"),
    created: "2020-02-20",
    type: AccountType.CHECKING,
    tags: ["crypto"],
  },
];
Accounts.forEach((a) => accountStore.add(a));
const ReferenceAccount = Accounts[0].account_uuid;
const HighlightTag = React.createContext({
  tag: "",
  setTag: (tag: string) => {},
});

const Transactions: ITransaction[] = [
  {
    entity_type: EntityType.TRANSACTION,
    transaction_uuid: generateUuid(),
    date: "2020-02-15",
    from_account: Accounts[1].account_uuid,
    to_account: Accounts[0].account_uuid,
    from_value: 3600,
    to_value: 3600,
    memo: "",
    tags: [],
  },
  {
    entity_type: EntityType.TRANSACTION,
    transaction_uuid: generateUuid(),
    date: "2020-02-15",
    from_account: Accounts[1].account_uuid,
    to_account: Accounts[0].account_uuid,
    from_value: 3200,
    to_value: 3200,
    memo: "Bonus #tax #cool",
    tags: ["tax", "cool"],
  },
  {
    entity_type: EntityType.TRANSACTION,
    transaction_uuid: generateUuid(),
    date: "2020-02-18",
    from_account: Accounts[0].account_uuid,
    to_account: Accounts[3].account_uuid,
    from_value: 12.11,
    to_value: 12.11,
    memo: "##2313322",
    tags: [],
  },
  {
    entity_type: EntityType.TRANSACTION,
    transaction_uuid: generateUuid(),
    date: "2020-02-20",
    from_account: Accounts[0].account_uuid,
    to_account: Accounts[4].account_uuid,
    from_value: 2000,
    to_value: 0.005381138,
    memo: "",
    tags: [],
  },
];

const formatterForAccount = (account_uuid: TAccountUUID) => {
  const account = accountStore.findByUuid(account_uuid);
  return (value: TMonetary) =>
    currencyStore.formatByUuid(account.currency_uuid, value);
};

const transactionValueFormatter = (_value: string, row: ITransaction) => {
  const formatter_to_acct = formatterForAccount(row.to_account);
  if (row.from_value === row.to_value) {
    const color = row.to_account === ReferenceAccount ? "green" : "red";
    return (
      <span style={{ color: color }}>{formatter_to_acct(row.to_value)}</span>
    );
  }
  const formatter_from_acct = formatterForAccount(row.from_account);
  return (
    formatter_from_acct(row.from_value) + "->" + formatter_to_acct(row.to_value)
  );
};

const TagsRenderer = (color: string, newTags: string[]) => {
  const highlighting = React.useContext(HighlightTag);
  return (
    <span>
      {newTags.map((t: string) => (
        <Tag
          key={t}
          color={highlighting.tag === t ? "#FF88FF" : color}
          onMouseOver={() => highlighting.setTag(t)}
          onMouseOut={() => highlighting.setTag("")}
        >
          #{t}
        </Tag>
      ))}
    </span>
  );
};

const renderMemoTags = (tags: string[]) => TagsRenderer("#FF8888", tags);
const renderFromTags = (tags: string[]) => TagsRenderer("#880088", tags);
const renderToTags = (tags: string[]) => TagsRenderer("#8888ff", tags);

const accountValueFormatter = (renderTags: any) => (
  value: string,
  _row: ITransaction
) => {
  const account = accountStore.findByUuid(value);
  return (
    <span>
      <b>{account.name}</b> {renderTags(account.tags)}
    </span>
  );
};

const toAccountValueFormatter = accountValueFormatter(renderToTags);
const fromAccountValueFormatter = accountValueFormatter(renderFromTags);

const memoValueFormatter = (value: string, row: ITransaction) => {
  const from_acct = accountStore.findByUuid(row.from_account);
  const to_acct = accountStore.findByUuid(row.to_account);
  const memo = value || "";
  const memo_tags = [...memo.matchAll(/[^#](#\w+)/g)].map((m) =>
    m[1].replace("#", "")
  );
  return (
    <span>
      {memo.replace("##", "#")}
      {renderMemoTags(memo_tags)}
      {renderFromTags(from_acct.tags)}
      {renderToTags(to_acct.tags)}
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
  const [tag, setTag] = React.useState("");
  return (
    <div className="App">
      <HighlightTag.Provider value={{ tag, setTag }}>
        <Table columns={columns} dataSource={Transactions} />
      </HighlightTag.Provider>
    </div>
  );
}

export default App;
