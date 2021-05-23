import { Menu } from "antd";
import React from "react";
import MoneeeyStore, { useMoneeeyStore } from "./MoneeeyStore";
import {
  AreaChartOutlined,
    CheckCircleTwoTone,
  DashboardOutlined,
  DollarOutlined,
  MailOutlined,
  SettingOutlined,
  WarningTwoTone,
} from "@ant-design/icons";
import { IAccount } from "./Account";
import { HomeRoute, AccountRoute, ReportsRoute } from "./Routes";
import { Observe } from "./Observable";
import { Status } from "./Persistence";

export default function AppMenu() {
  const { navigation, accounts, currencies, persistence } = useMoneeeyStore();
  const getAccountCurrency = (account: IAccount) => {
    const curr = currencies.byUuid(account.currency_uuid);
    if (curr) {
      return <b>{curr.short}</b>;
    }
    return <b>?</b>;
  };
  return (
    <Observe subjects={[accounts, persistence]}>
      {(_v) => (
      <Menu mode="horizontal" triggerSubMenuAction="click">
        <Menu.Item
          key="dashboard"
          icon={<DashboardOutlined />}
          onClick={() => navigation.navigate(HomeRoute.url())}
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
                    AccountRoute.accountUrl(acct)
                  )
                }
                key={acct.account_uuid}
              >
                {getAccountCurrency(acct)} {acct.name}
              </Menu.Item>
            ))}
          <Menu.Item
            key="accounts"
            onClick={() => navigation.navigate(HomeRoute.url())}
          >
            <b>Edit Accounts</b>
          </Menu.Item>
        </Menu.SubMenu>
        <Menu.Item
          key="budgets"
          icon={<MailOutlined />}
          onClick={() => navigation.navigate(HomeRoute.url())}
        >
          Budgets
        </Menu.Item>
        <Menu.Item
          key="reports"
          icon={<AreaChartOutlined />}
          onClick={() => navigation.navigate(ReportsRoute.url())}
        >
          Reports
        </Menu.Item>
        <Menu.SubMenu key="Settings" icon={<SettingOutlined />} title="Settings">
          <Menu.Item
            key="currencies"
            onClick={() => navigation.navigate(HomeRoute.url())}
          >
            Edit Currencies
          </Menu.Item>
          <Menu.Item
            key="payees"
            onClick={() => navigation.navigate(HomeRoute.url())}
          >
            Edit Payees
          </Menu.Item>
          <Menu.Item
            key="accounts"
            onClick={() => navigation.navigate(HomeRoute.url())}
          >
            Edit Accounts
          </Menu.Item>
        </Menu.SubMenu>
        <Menu.Item
          key="sync"
          icon={persistence.status === Status.ONLINE
            ? <CheckCircleTwoTone twoToneColor="green" />
            : <WarningTwoTone twoToneColor="red" />}
          onClick={() => navigation.navigate(HomeRoute.url())}
        >
          {persistence.status}
        </Menu.Item>
      </Menu>
    )}
    </Observe>
  );
}
