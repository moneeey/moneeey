import { Bar, Column, Line } from "@ant-design/charts";
import { DownOutlined } from "@ant-design/icons";
import { Dropdown, Menu } from "antd";
import {
  startOfDay,
  startOfMonth,
  startOfQuarter,
  startOfWeek,
  startOfYear,
} from "date-fns";
import React from "react";
import { TAccountUUID } from "./Account";
import { TDate, formatDate, parseDate, compareDates } from "./Date";
import { TMonetary } from "./Entity";
import { useMoneeeyStore } from "./MoneeeyStore";
import { ITransaction } from "./Transaction";

enum PeriodGroup {
  Day = "Day",
  Week = "Week",
  Month = "Month",
  Quarter = "Quarter",
  Year = "Year",
}

const PeriodGroups = Object.keys(PeriodGroup);

const PeriodGroupFns: { [_p: string]: (_d: Date) => Date } = {
  [PeriodGroup.Day]: startOfDay,
  [PeriodGroup.Week]: startOfWeek,
  [PeriodGroup.Month]: startOfMonth,
  [PeriodGroup.Quarter]: startOfQuarter,
  [PeriodGroup.Year]: startOfYear,
};

function dateToPeriod(period: PeriodGroup, date: TDate) {
  return formatDate(PeriodGroupFns[period](parseDate(date)));
}

export function DateGroupingSelector({
  setPeriod,
  period,
}: {
  setPeriod: (newPeriod: PeriodGroup) => void;
  period: PeriodGroup;
}) {
  return (
    <Dropdown
      overlay={
        <Menu>
          {PeriodGroups.map((p) => (
            <Menu.Item key={p} onClick={() => setPeriod(p as PeriodGroup)}>
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

export function BalanceGrowthReport() {
  const [period, setPeriod] = React.useState(PeriodGroup.Week);
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
    const group_date = dateToPeriod(period, date);
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
      <h2>Balance Growth</h2>
      <DateGroupingSelector setPeriod={setPeriod} period={period} />
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
          smooth: true,
          point: {
            size: 5,
            shape: "diamond",
          },
        }}
      />
    </>
  );
}

export function TagExpensesReport() {
  const [period, setPeriod] = React.useState(PeriodGroup.Month);
  const moneeeyStore = useMoneeeyStore();
  const accounts = moneeeyStore.accounts.allNonPayees();
  const account_names: { [_a: string]: string } = {};
  accounts.forEach((a) => {
    account_names[a.account_uuid] = a.name;
  });
  const transactions = moneeeyStore.transactions.viewAllWithAccounts(
    accounts.map((a) => a.account_uuid)
  );
  const balances: { [_tag: string]: number } = {};
  const data: Map<
    string,
    {
      date: TDate;
      balance: TMonetary;
      tag: string;
    }
  > = new Map();
  const addBalanceToData = (tag: string, value: TMonetary, date: TDate) => {
    const group_date = dateToPeriod(period, date);
    const group = group_date + tag;
    if (!balances[group]) {
      balances[group] = 0;
    }
    const balance = balances[group] + value;
    balances[group] = balance;
    data.set(group, {
      date: group_date,
      balance,
      tag,
    });
  };
  transactions.forEach((t) => {
    const addTagsForAccount = (
      account_uuid: TAccountUUID,
      transaction: ITransaction,
      value: number,
      is_personal_account: boolean
    ) => {
      const account_tags = !is_personal_account
        ? moneeeyStore.accounts.byUuid(account_uuid).tags
        : [];
      const tags = [...account_tags, ...transaction.tags];
      const unique_tags = new Set(tags);
      unique_tags.forEach((tag) =>
        addBalanceToData(
          tag,
          is_personal_account ? -value : value,
          transaction.date
        )
      );
    };
    addTagsForAccount(
      t.from_account,
      t,
      t.from_value,
      !!account_names[t.from_account]
    );
    addTagsForAccount(
      t.to_account,
      t,
      t.to_value,
      !!account_names[t.to_account]
    );
  });

  return (
    <>
      <h2>Tag Expenses</h2>
      <DateGroupingSelector setPeriod={setPeriod} period={period} />
      <Column
        {...{
          data: Array.from(data.values()).sort((a, b) =>
            compareDates(a.date, b.date)
          ),
          height: 400,
          xField: "date",
          yField: "balance",
          seriesField: "tag",
          connectNulls: true,
        }}
      />
    </>
  );
}

export function Reports() {
  return (
    <>
      <BalanceGrowthReport />
      <TagExpensesReport />
    </>
  );
}
