import {
  AreaChartOutlined,
  CheckCircleTwoTone,
  DashboardOutlined,
  DollarOutlined,
  MailOutlined,
  SettingOutlined,
  WarningTwoTone,
} from '@ant-design/icons'
import { Menu, Typography } from 'antd'
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
import { BudgetRoute } from '../routes/BudgetRoute'
import Messages from '../utils/Messages'
import { NavigationModal } from '../shared/Navigation'

export const AppMenu = observer(() => {
  const { navigation, accounts, currencies, persistence } = useMoneeeyStore()
  const getAccountCurrency = (account: IAccount) => {
    const curr = currencies.byUuid(account.currency_uuid)
    return curr?.short || curr?.name || '?'
  }
  return (
    <Menu
      mode="horizontal"
      triggerSubMenuAction="click"
      items={[
        {
          key: 'dashboard',
          label: Messages.menu.dashboard,
          icon: <DashboardOutlined />,
          onClick: () => navigation.navigate(HomeRoute.url()),
        },
        {
          key: 'transactions',
          label: Messages.menu.transactions,
          icon: <DollarOutlined />,
          children: [
            {
              key: 'import',
              label: Messages.menu.import,
              onClick: () => navigation.navigate(ImportRoute.url()),
            },
            ...accounts.allNonPayees
              .filter((t) => t.archived !== true)
              .sort((a, b) => a.currency_uuid?.localeCompare(b.currency_uuid))
              .map((acct) => ({
                key: 'account_' + acct._id,
                label: (
                  <span>
                    <Typography.Text type="secondary">
                      {getAccountCurrency(acct)}
                    </Typography.Text>{' '}
                    {acct.name}
                  </span>
                ),
                onClick: () =>
                  navigation.navigate(AccountRoute.accountUrl(acct)),
              })),
            {
              key: 'unassigned',
              label: Messages.menu.unassigned,
              onClick: () =>
                navigation.navigate(AccountRoute.accountUrlForUnclassified()),
            },
          ],
        },
        {
          key: 'budget',
          label: Messages.menu.budget,
          icon: <MailOutlined />,
          onClick: () => navigation.navigate(BudgetRoute.url()),
        },
        {
          key: 'reports',
          label: Messages.menu.reports,
          icon: <AreaChartOutlined />,
          onClick: () => navigation.navigate(ReportsRoute.url()),
        },
        {
          key: 'settings',
          label: Messages.menu.settings,
          icon: <SettingOutlined />,
          children: [
            {
              key: 'settings_currencies',
              label: Messages.menu.currencies,
              onClick: () => navigation.navigate(CurrencySettingsRoute.url()),
            },
            {
              key: 'settings_payees',
              label: Messages.menu.payees,
              onClick: () => navigation.navigate(PayeeSettingsRoute.url()),
            },
            {
              key: 'settings_accounts',
              label: Messages.menu.accounts,
              onClick: () => navigation.navigate(AccountSettingsRoute.url()),
            },
            {
              key: 'settings_general',
              label: Messages.menu.preferences,
              onClick: () => navigation.navigate(SettingsRoute.url()),
            },
            {
              key: 'settings_landing',
              label: Messages.menu.landing,
              onClick: () => navigation.openModal(NavigationModal.LANDING),
            },
          ],
        },
        {
          key: 'sync',
          label: Messages.menu.sync[persistence.status],
          icon:
            persistence.status === Status.ONLINE ? (
              <CheckCircleTwoTone twoToneColor="green" />
            ) : (
              <WarningTwoTone twoToneColor="red" />
            ),
          onClick: () => navigation.openModal(NavigationModal.SYNC),
        },
      ]}
    ></Menu>
  )
})

export default AppMenu
