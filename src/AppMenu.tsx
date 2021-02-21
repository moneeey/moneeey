import { Menu } from "antd";
import React from "react";
import MoneeeyStore from "./MoneeeyStore";
import { NavigationArea } from "./Navigation";
import {
  AreaChartOutlined,
  DashboardOutlined,
  DollarOutlined,
  SettingOutlined,
} from "@ant-design/icons";

export default function AppMenu({
  moneeeyStore,
}: {
  moneeeyStore: MoneeeyStore;
}) {
  const { navigation, accounts } = moneeeyStore;
  return (
    <Menu mode="horizontal">
      <Menu.Item
        key="dashboard"
        icon={<DashboardOutlined />}
        onClick={() => navigation.navigate(NavigationArea.Dashboard)}
      >
        Dashboard
      </Menu.Item>
      <Menu.SubMenu
        key="Transactions"
        icon={<DollarOutlined />}
        title="Transactions"
      >
        {accounts.allNonPayees().map((acct) => (
          <Menu.Item
            onClick={() =>
              navigation.navigate(
                NavigationArea.AccountTransactions,
                acct.account_uuid
              )
            }
            key={acct.account_uuid}
          >
            {acct.name}
          </Menu.Item>
        ))}
        <Menu.Item
          key="accounts"
          onClick={() => navigation.navigate(NavigationArea.Accounts)}
        >
          <b>Edit Accounts</b>
        </Menu.Item>
      </Menu.SubMenu>
      <Menu.Item key="reports" icon={<AreaChartOutlined />}>
        Reports
      </Menu.Item>
      <Menu.SubMenu key="Settings" icon={<SettingOutlined />} title="Settings">
        <Menu.Item
          key="currencies"
          onClick={() => navigation.navigate(NavigationArea.Currencies)}
        >
          Edit Currencies
        </Menu.Item>
        <Menu.Item
          key="payees"
          onClick={() => navigation.navigate(NavigationArea.Payees)}
        >
          Edit Payees
        </Menu.Item>
        <Menu.Item
          key="accounts"
          onClick={() => navigation.navigate(NavigationArea.Accounts)}
        >
          Edit Accounts
        </Menu.Item>
      </Menu.SubMenu>
    </Menu>
  );
}
