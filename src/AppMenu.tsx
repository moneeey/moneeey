import { Menu } from "antd";
import React from "react";
import MoneeeyStore from "./MoneeeyStore";
import {
  AreaChartOutlined,
  DashboardOutlined,
  DollarOutlined,
  MailOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import { IAccount } from "./Account";
import { Home, Account } from "./Routes";

export default function AppMenu({
  moneeeyStore,
}: {
  moneeeyStore: MoneeeyStore;
}) {
  const { navigation, accounts } = moneeeyStore;
  const getAccountCurrency = (account: IAccount) => {
    const curr = moneeeyStore.currencies.byUuid(account.currency_uuid);
    if (curr) {
      return <b>{curr.short}</b>;
    }
    return <b>?</b>;
  };
  return (
    <Menu mode="horizontal" triggerSubMenuAction="click">
      <Menu.Item
        key="dashboard"
        icon={<DashboardOutlined />}
        onClick={() => navigation.navigate(Home.url())}
      >
        Dashboard
      </Menu.Item>
      <Menu.SubMenu key="Accounts" icon={<DollarOutlined />} title="Accounts">
        {accounts
          .allNonPayees()
          .sort((a, b) => a.currency_uuid.localeCompare(b.currency_uuid))
          .map((acct) => (
            <Menu.Item
              onClick={() =>
                navigation.navigate(
                  Account.accountUrl(acct)
                )
              }
              key={acct.account_uuid}
            >
              {getAccountCurrency(acct)} {acct.name}
            </Menu.Item>
          ))}
        <Menu.Item
          key="accounts"
          onClick={() => navigation.navigate(Home.url())}
        >
          <b>Edit Accounts</b>
        </Menu.Item>
      </Menu.SubMenu>
      <Menu.Item
        key="budgets"
        icon={<MailOutlined />}
        onClick={() => navigation.navigate(Home.url())}
      >
        Budgets
      </Menu.Item>
      <Menu.Item
        key="reports"
        icon={<AreaChartOutlined />}
        onClick={() => navigation.navigate(Home.url())}
      >
        Reports
      </Menu.Item>
      <Menu.SubMenu key="Settings" icon={<SettingOutlined />} title="Settings">
        <Menu.Item
          key="currencies"
          onClick={() => navigation.navigate(Home.url())}
        >
          Edit Currencies
        </Menu.Item>
        <Menu.Item
          key="payees"
          onClick={() => navigation.navigate(Home.url())}
        >
          Edit Payees
        </Menu.Item>
        <Menu.Item
          key="accounts"
          onClick={() => navigation.navigate(Home.url())}
        >
          Edit Accounts
        </Menu.Item>
      </Menu.SubMenu>
    </Menu>
  );
}
