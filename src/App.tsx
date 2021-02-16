import React from "react";
import "react-tabulator/lib/styles.css";
import "react-tabulator/lib/css/bulma/tabulator_bulma.css";
import { ReactTabulator } from "react-tabulator";
import { v4 as uuidv4 } from "uuid";
import "./App.css";

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

const Accounts = [
  {
    uuid: uuidv4(),
    name: "MoneeeyBank",
    currency: "BRL",
    created: "2020-02-15",
    type: AccountType.CHECKING,
    tags: [],
  },
  {
    uuid: uuidv4(),
    name: "MyEmployee",
    currency: "BRL",
    created: "2020-02-15",
    type: AccountType.PAYEE,
    tags: ["tax"],
  },
  {
    uuid: uuidv4(),
    name: "SuperGroceriesMarket",
    currency: "BRL",
    created: "2020-02-15",
    type: AccountType.PAYEE,
    tags: ["groceries"],
  },
  {
    uuid: uuidv4(),
    name: "CoffeShop",
    currency: "BRL",
    created: "2020-02-15",
    type: AccountType.PAYEE,
    tags: ["health", "tax"],
  },
  {
    uuid: uuidv4(),
    name: "BTC-Wallet",
    currency: "BTC",
    created: "2020-02-20",
    type: AccountType.CHECKING,
    tags: ["crypto"],
  },
];

var data = [
  {
    id: 1,
    date: "2020-02-15",
    from_account: Accounts[1],
    to_account: Accounts[0],
    from_value: 3600,
    to_value: 3600,
    memo: "",
  },
  {
    id: 1,
    date: "2020-02-15",
    from_account: Accounts[1],
    to_account: Accounts[0],
    from_value: 3200,
    to_value: 3200,
    memo: "Bonus #tax",
  },
  {
    id: 1,
    date: "2020-02-18",
    from_account: Accounts[0],
    to_account: Accounts[3],
    from_value: 12.11,
    to_value: 12.11,
    memo: "",
  },
  {
    id: 1,
    date: "2020-02-20",
    from_account: Accounts[0],
    to_account: Accounts[4],
    from_value: 2000,
    to_value: 0.005381138,
    memo: "",
  },
];

interface TabulatorCell<CellRow, CellValue> {
  getValue(): CellValue;
  getData(): CellRow;
}

const columns = [
  { title: "Date", field: "date", width: 150 },
  {
    title: "From",
    field: "from_account",
    width: 250,
    formatter: (cell: any) => cell.getValue().name,
  },
  {
    title: "To",
    field: "to_account",
    width: 250,
    formatter: (cell: any) => cell.getValue().name,
  },
  {
    title: "Value",
    field: "to_value",
    width: 250,
    formatter: (cell: TabulatorCell<any, number>) => {
      const row = cell.getData();
      const to_curr = Currencies[row.to_account.currency as any];
      if (row.from_value === row.to_value) {
        return to_curr.format(row.to_value);
      }
      const from_curr = Currencies[row.from_account.currency as any];
      return (
        from_curr.format(row.from_value) + "->" + to_curr.format(row.to_value)
      );
    },
  },
  { title: "Memo", field: "memo" },
];

function App() {
  return (
    <div className="App">
      <ReactTabulator
        data={data}
        columns={columns}
        tooltips={true}
        layout={"fitData"}
      />
    </div>
  );
}

export default App;
