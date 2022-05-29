import {
  AreaChartOutlined,
  CheckCircleTwoTone,
  DashboardOutlined,
  DollarOutlined,
  MailOutlined,
  SettingOutlined,
  WarningTwoTone,
} from '@ant-design/icons';
import { Menu } from 'antd';
import { observer } from 'mobx-react';
import React from 'react';

import { AccountRoute } from '../routes/AccountRoute';
import { AccountSettingsRoute } from '../routes/AccountSettingsRoute';
import { CurrencySettingsRoute } from '../routes/CurrencySettingsRoute';
import { HomeRoute } from '../routes/HomeRouter';
import { PayeeSettingsRoute } from '../routes/PayeeSettingsRoute';
import { ReportsRoute } from '../routes/ReportsRoute';
import { AccountStore, IAccount } from '../shared/Account';
import { CurrencyStore } from '../shared/Currency';
import NavigationStore from '../shared/Navigation';
import PersistenceStore, { Status } from '../shared/Persistence';
import useMoneeeyStore from '../useMoneeeyStore';

export const AccountsSubMenu = observer(
  ({
    accounts,
    currencies,
    navigation
  }: {
    accounts: AccountStore;
    currencies: CurrencyStore;
    navigation: NavigationStore;
  }) => {
    const getAccountCurrency = (account: IAccount) => {
      const curr = currencies.byUuid(account.currency_uuid);
      if (curr) {
        return <b>{curr.short}</b>;
      }
      return <b>?</b>;
    };
    return (
      <Menu.SubMenu key='Accounts' icon={<DollarOutlined />} title='Accounts'>
        {accounts
          .allNonPayees()
          .sort((a, b) => a.currency_uuid.localeCompare(b.currency_uuid))
          .map((acct) => (
            <Menu.Item onClick={() => navigation.navigate(AccountRoute.accountUrl(acct))} key={acct.account_uuid}>
              {getAccountCurrency(acct)} {acct.name}
            </Menu.Item>
          ))}
        <Menu.Item key='accounts' onClick={() => navigation.navigate(HomeRoute.url())}>
          <b>Edit Accounts</b>
        </Menu.Item>
      </Menu.SubMenu>
    );
  }
);

const PersistenceSubMenu = observer(
  ({ persistence, navigation }: { persistence: PersistenceStore; navigation: NavigationStore }) => {
    return (
      <Menu.Item
        key='sync'
        icon={
          persistence.status === Status.ONLINE ? (
            <CheckCircleTwoTone twoToneColor='green' />
          ) : (
            <WarningTwoTone twoToneColor='red' />
          )
        }
        onClick={() => navigation.navigate(HomeRoute.url())}>
        {persistence.status}
      </Menu.Item>
    );
  }
);

export default function AppMenu() {
  const { navigation, accounts, currencies, persistence } = useMoneeeyStore();
  return (
    <Menu mode='horizontal' triggerSubMenuAction='click'>
      <Menu.Item key='dashboard' icon={<DashboardOutlined />} onClick={() => navigation.navigate(HomeRoute.url())}>
        Dashboard
      </Menu.Item>
      <AccountsSubMenu {...{ accounts, currencies, navigation }} />
      <Menu.Item key='budgets' icon={<MailOutlined />} onClick={() => navigation.navigate(HomeRoute.url())}>
        Budgets
      </Menu.Item>
      <Menu.Item key='reports' icon={<AreaChartOutlined />} onClick={() => navigation.navigate(ReportsRoute.url())}>
        Reports
      </Menu.Item>
      <Menu.SubMenu key='Settings' icon={<SettingOutlined />} title='Settings'>
        <Menu.Item key='currencies' onClick={() => navigation.navigate(CurrencySettingsRoute.url())}>
          Edit Currencies
        </Menu.Item>
        <Menu.Item key='payees' onClick={() => navigation.navigate(PayeeSettingsRoute.url())}>
          Edit Payees
        </Menu.Item>
        <Menu.Item key='accounts' onClick={() => navigation.navigate(AccountSettingsRoute.url())}>
          Edit Accounts
        </Menu.Item>
      </Menu.SubMenu>
      <PersistenceSubMenu {...{ persistence, navigation }} />
    </Menu>
  );
}
