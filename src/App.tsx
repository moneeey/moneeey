import React from "react";
import "react-tabulator/lib/styles.css";
import "react-tabulator/lib/css/bulma/tabulator_bulma.css";
import { ReactTabulator } from "react-tabulator";
import { v4 as uuidv4 } from "uuid";
import "./App.css";

const generateUuid = () => uuidv4();

const Currencies: {
  [_index: string]: { format: (value: number) => string };
} = {
  BRL: {
    format: (value: number) => "R$ " + value,
  },
  BTC: {
    format: (value: number) => value + " BTC",
  },
};

enum AccountType {
  CHECKING = "CHECKING",
  CREDIT_CARD = "CREDIT_CARD",
  PAYEE = "PAYEE",
}

type TMonetary = number;
type TAccountUUID = string;
type TTransactionUUID = string;
type TDate = string;

interface IAccount {
  account_uuid: TAccountUUID;
  name: string;
  currency: string;
  created: TDate;
  type: AccountType;
  tags: string[];
}
interface ITransaction {
  transaction_uuid: TTransactionUUID;
  date: TDate;
  from_account: TAccountUUID;
  to_account: TAccountUUID;
  from_value: TMonetary;
  to_value: TMonetary;
  memo: string;
}

const Accounts: IAccount[] = [
  {
    account_uuid: generateUuid(),
    name: "MoneeeyBank",
    currency: "BRL",
    created: "2020-02-15",
    type: AccountType.CHECKING,
    tags: [],
  },
  {
    account_uuid: generateUuid(),
    name: "MyEmployee",
    currency: "BRL",
    created: "2020-02-15",
    type: AccountType.PAYEE,
    tags: ["tax"],
  },
  {
    account_uuid: generateUuid(),
    name: "SuperGroceriesMarket",
    currency: "BRL",
    created: "2020-02-15",
    type: AccountType.PAYEE,
    tags: ["groceries"],
  },
  {
    account_uuid: generateUuid(),
    name: "CoffeShop",
    currency: "BRL",
    created: "2020-02-15",
    type: AccountType.PAYEE,
    tags: ["health", "tax"],
  },
  {
    account_uuid: generateUuid(),
    name: "BTC-Wallet",
    currency: "BTC",
    created: "2020-02-20",
    type: AccountType.CHECKING,
    tags: ["crypto"],
  },
];
const ReferenceAccount = Accounts[0].account_uuid;

const Transactions: ITransaction[] = [
  {
    transaction_uuid: generateUuid(),
    date: "2020-02-15",
    from_account: Accounts[1].account_uuid,
    to_account: Accounts[0].account_uuid,
    from_value: 3600,
    to_value: 3600,
    memo: "",
  },
  {
    transaction_uuid: generateUuid(),
    date: "2020-02-15",
    from_account: Accounts[1].account_uuid,
    to_account: Accounts[0].account_uuid,
    from_value: 3200,
    to_value: 3200,
    memo: "Bonus #tax",
  },
  {
    transaction_uuid: generateUuid(),
    date: "2020-02-18",
    from_account: Accounts[0].account_uuid,
    to_account: Accounts[3].account_uuid,
    from_value: 12.11,
    to_value: 12.11,
    memo: "",
  },
  {
    transaction_uuid: generateUuid(),
    date: "2020-02-20",
    from_account: Accounts[0].account_uuid,
    to_account: Accounts[4].account_uuid,
    from_value: 2000,
    to_value: 0.005381138,
    memo: "",
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
  const currency_id = account.currency;
  const currency = Currencies[currency_id];
  if (!currency) {
    console.warn(
      "No currency found for account uuid " +
        account_uuid +
        " currency: " +
        currency_id
    );
    return () => "ERROR";
  }
  return currency.format;
};

const transactionValueFormatter = (cell: TabulatorCell<any, number>) => {
  const row = cell.getData();
  const formatter_to_acct = formatterForAccount(row.to_account);
  if (row.from_value === row.to_value) {
    const color = row.to_account === ReferenceAccount ? "green" : "red";
    return `<span color="${color}">${formatter_to_acct(row.to_value)}</span>`;
  }
  const formatter_from_acct = formatterForAccount(row.from_account);
  return (
    formatter_from_acct(row.from_value) + "->" + formatter_to_acct(row.to_value)
  );
};

const accountValueFormatter = (cell: TabulatorCell<any, TAccountUUID>) => {
  const account = findAccountByUuid(cell.getValue());
  return `<b>${account.name}</b> <i>${account.tags.map((t) => " #" + t)}</i>`;
};

const columns = [
  { title: "Date", field: "date", width: 150 },
  {
    title: "From",
    field: "from_account",
    width: 250,
    formatter: accountValueFormatter,
  },
  {
    title: "To",
    field: "to_account",
    width: 250,
    formatter: accountValueFormatter,
  },
  {
    title: "Value",
    field: "to_value",
    width: 250,
    formatter: transactionValueFormatter,
  },
  { title: "Memo", field: "memo" },
];

function App() {
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
