import React from "react";
import "react-tabulator/lib/styles.css";
import "react-tabulator/lib/css/bulma/tabulator_bulma.css";
import { ReactTabulator } from "react-tabulator";
import "./App.css";
import { EntityType, generateUuid, TMonetary } from "./Entity";
import { TAccountUUID, IAccount, AccountType } from "./Account";
import { ITransaction } from "./Transaction";
import { CurrencyStore } from "./Currency";

const currencyStore = new CurrencyStore();
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

const Accounts: IAccount[] = [
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
const ReferenceAccount = Accounts[0].account_uuid;

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

interface TabulatorCell<CellRow, CellValue> {
  getValue(): CellValue;
  getData(): CellRow;
}

const findAccountByUuid = (account_uuid: TAccountUUID): IAccount => {
  const accounts = Accounts.filter((v) => v.account_uuid === account_uuid);
  if (accounts.length !== 1) {
    throw new Error("Account not found with uuid: " + account_uuid);
  }
  return accounts[0];
};

const formatterForAccount = (account_uuid: TAccountUUID) => {
  const account = findAccountByUuid(account_uuid);
  const currency_uuid = account.currency_uuid;
  return (value: TMonetary) => currencyStore.formatByUuid(currency_uuid, value);
};

const transactionValueFormatter = (
  cell: TabulatorCell<ITransaction, number>
) => {
  const row = cell.getData();
  const formatter_to_acct = formatterForAccount(row.to_account);
  if (row.from_value === row.to_value) {
    const color = row.to_account === ReferenceAccount ? "green" : "red";
    return `<span style="color: ${color}">${formatter_to_acct(
      row.to_value
    )}</span>`;
  }
  const formatter_from_acct = formatterForAccount(row.from_account);
  return (
    formatter_from_acct(row.from_value) + "->" + formatter_to_acct(row.to_value)
  );
};

const accountValueFormatter = (
  cell: TabulatorCell<ITransaction, TAccountUUID>
) => {
  const account = findAccountByUuid(cell.getValue());
  return `<b>${account.name}</b> <i>${account.tags.map((t) => " #" + t)}</i>`;
};

const memoValueFormatter = (cell: TabulatorCell<ITransaction, string>) => {
  const from_acct = findAccountByUuid(cell.getData().from_account);
  const to_acct = findAccountByUuid(cell.getData().to_account);
  const memo = cell.getValue() || "isolatedModules";
  const memo_tags = [...memo.matchAll(/[^#](#\w+)/g)].map((m) =>
    m[1].replace("#", "")
  );
  console.log(memo_tags);
  const tags: string[] = [];
  const addTags = (color: string, origin: string, newTags: string[]) =>
    newTags.forEach((t: string) =>
      tags.push(
        `<span style="color: ${color}; text-style: italic" alt="${origin}">#${t} </span>`
      )
    );
  addTags("#FF8888", "Memo tag", memo_tags);
  addTags("#880088", "From Account tag", from_acct.tags);
  addTags("#8888FF", "To Account tag", to_acct.tags);
  return `${cell.getValue().replace("##", "#")} <i>${tags.join(" ")}</i>`;
};

const columns = [
  { title: "Date", field: "date", width: 150 },
  {
    title: "From",
    field: "from_account",
    width: 300,
    formatter: accountValueFormatter,
  },
  {
    title: "To",
    field: "to_account",
    width: 300,
    formatter: accountValueFormatter,
  },
  {
    title: "Value",
    field: "to_value",
    width: 250,
    formatter: transactionValueFormatter,
  },
  { title: "Memo", field: "memo", formatter: memoValueFormatter },
];

function App(): React.ReactElement {
  return (
    <div className="App">
      <ReactTabulator
        data={Transactions}
        columns={columns}
        tooltips={true}
        layout={"fitData"}
      />
    </div>
  );
}

export default App;
