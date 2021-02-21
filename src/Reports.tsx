import { Line } from "@ant-design/charts";
import { DownOutlined } from "@ant-design/icons";
import { Dropdown, Menu } from "antd";
import { startOfDay, startOfMonth, startOfWeek, startOfYear } from "date-fns";
import React from "react";
import { TAccountUUID } from "./Account";
import {
  compareDates,
  formatDate,
  parseDate,
  TDate,
  TMonetary,
} from "./Entity";
import { useMoneeeyStore } from "./MoneeeyStore";

const groupingFns: { [_p: string]: (_d: Date) => Date } = {
  Day: startOfDay,
  Week: startOfWeek,
  Month: startOfMonth,
  Year: startOfYear,
};

export function DateGroupingSelector({
  selectPeriod,
  period,
}: {
  selectPeriod: (_periodName: string) => void;
  period: string;
}) {
  return (
    <Dropdown
      overlay={
        <Menu>
          {Object.getOwnPropertyNames(groupingFns).map((p) => (
            <Menu.Item key={p} onClick={() => selectPeriod(p)}>
              {p}
            </Menu.Item>
          ))}
        </Menu>
      }
      trigger={["click"]}
    >
      <a className="ant-dropdown-link" onClick={(e) => e.preventDefault()}>
        {period} <DownOutlined />
      </a>
    </Dropdown>
  );
}

export function MoneyGrowthReport() {
  const [period, setPeriod] = React.useState(
    Object.getOwnPropertyNames(groupingFns)[1]
  );
  const dateGroupingFn = (date: TDate): TDate =>
    formatDate(groupingFns[period](parseDate(date)));
  const moneeeyStore = useMoneeeyStore();
  const accounts = moneeeyStore.accounts.allNonPayees();
  const account_names: { [_a: string]: string } = {};
  accounts.forEach((a) => (account_names[a.account_uuid] = a.name));
  const transactions = moneeeyStore.transactions.viewAllWithAccounts(
    accounts.map((a) => a.account_uuid)
  );
  const balances: { [_acc: string]: number } = {};
  const data: Map<
    string,
    {
      date: TDate;
      balance: TMonetary;
      account_name: string;
    }
  > = new Map();
  const addBalanceToData = (
    acct: TAccountUUID,
    value: TMonetary,
    date: TDate
  ) => {
    if (!balances[acct]) {
      balances[acct] = 0;
    }
    const balance = balances[acct] + value;
    balances[acct] = balance;
    const account_name = account_names[acct];
    const group_date = dateGroupingFn(date);
    data.set(group_date + account_name, {
      date: group_date,
      balance,
      account_name,
    });
  };
  transactions.forEach((t) => {
    if (account_names[t.from_account]) {
      addBalanceToData(t.from_account, -t.from_value, t.date);
    }
    if (account_names[t.to_account]) {
      addBalanceToData(t.to_account, t.to_value, t.date);
    }
  });

  return (
    <>
      <DateGroupingSelector selectPeriod={setPeriod} period={period} />
      <Line
        {...{
          data: Array.from(data.values()).sort((a, b) =>
            compareDates(a.date, b.date)
          ),
          height: 400,
          xField: "date",
          yField: "balance",
          seriesField: "account_name",
          connectNulls: true,
          point: {
            size: 5,
            shape: "diamond",
          },
        }}
      />
    </>
  );
}

export function Reports() {
  return <MoneyGrowthReport />;
}
