import {
  AreaChartOutlined,
  CheckCircleTwoTone,
  DashboardOutlined,
  DollarOutlined,
  MailOutlined,
  SettingOutlined,
  WarningTwoTone,
} from '@ant-design/icons'
import { Menu } from 'antd'
import { observer } from 'mobx-react'

import { AccountRoute } from '../routes/AccountRoute'
import { AccountSettingsRoute } from '../routes/AccountSettingsRoute'
import { CurrencySettingsRoute } from '../routes/CurrencySettingsRoute'
import { HomeRoute } from '../routes/HomeRouter'
import { PayeeSettingsRoute } from '../routes/PayeeSettingsRoute'
import { ReportsRoute } from '../routes/ReportsRoute'
import { IAccount } from '../entities/Account'
import { Status } from '../shared/Persistence'
import useMoneeeyStore from '../shared/useMoneeeyStore'
import { ImportRoute } from '../routes/ImportRoute'
import { SettingsRoute } from '../routes/SettingsRoute'

export const AppMenu = observer(() => {
  const { navigation, accounts, currencies, persistence } = useMoneeeyStore()
  const getAccountCurrency = (account: IAccount) => {
    const curr = currencies.byUuid(account.currency_uuid)
    return curr?.short || curr?.name || '?'
  }
  return (
    <Menu
      mode='horizontal'
      triggerSubMenuAction='click'
      items={[
        {
          key: 'dashboard',
          label: 'Dashboard',
          icon: <DashboardOutlined />,
          onClick: () => navigation.navigate(HomeRoute.url())
        },
        {
          key: 'transactions',
          label: 'Transactions',
          icon: <DollarOutlined />,
          children: [
            ...accounts
              .allNonPayees
              .sort((a, b) => a.currency_uuid?.localeCompare(b.currency_uuid))
              .map((acct) => ({
                key: 'account_' + acct._id,
                label: `${getAccountCurrency(acct)} ${acct.name}`,
                onClick: () => navigation.navigate(AccountRoute.accountUrl(acct))
              })),
            { key: 'unassigned', label: 'Unassigned', onClick: () => navigation.navigate(AccountRoute.url({ account_name: '-' })) },
            { key: 'import', label: 'Import', onClick: () => navigation.navigate(ImportRoute.url()) },
          ]
        },
        { key: 'budget', label: 'Budget', icon: <MailOutlined />, onClick: () => navigation.navigate(HomeRoute.url()) },
        {
          key: 'reports',
          label: 'Reports',
          icon: <AreaChartOutlined />,
          onClick: () => navigation.navigate(ReportsRoute.url())
        },
        {
          key: 'settings',
          label: 'Settings',
          icon: <SettingOutlined />,
          children: [
            {
              key: 'settings_currencies',
              label: 'Currencies',
              onClick: () => navigation.navigate(CurrencySettingsRoute.url())
            },
            { key: 'settings_payees', label: 'Payees', onClick: () => navigation.navigate(PayeeSettingsRoute.url()) },
            {
              key: 'settings_accounts',
              label: 'Accounts',
              onClick: () => navigation.navigate(AccountSettingsRoute.url())
            },
            {
              key: 'settings_general',
              label: 'Settings',
              onClick: () => navigation.navigate(SettingsRoute.url())
            },
          ]
        },
        {
          key: 'sync',
          label: persistence.status,
          icon:
            persistence.status === Status.ONLINE ? (
              <CheckCircleTwoTone twoToneColor='green' />
            ) : (
              <WarningTwoTone twoToneColor='red' />
            ),
          onClick: () => navigation.navigate(HomeRoute.url())
        }
      ]}></Menu>
  )
})

export default AppMenu