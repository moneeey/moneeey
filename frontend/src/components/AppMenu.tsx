import {
  ChartPieIcon,
  ClipboardDocumentIcon,
  Cog6ToothIcon,
  CurrencyDollarIcon,
  EnvelopeIcon,
  PlayCircleIcon,
  StopCircleIcon,
} from '@heroicons/react/24/outline';
import { observer } from 'mobx-react';

import AccountRoute from '../routes/AccountRoute';
import { AccountSettingsRoute } from '../routes/AccountSettingsRoute';
import { CurrencySettingsRoute } from '../routes/CurrencySettingsRoute';
import HomeRoute from '../routes/HomeRouter';
import { PayeeSettingsRoute } from '../routes/PayeeSettingsRoute';
import ReportsRoute from '../routes/ReportsRoute';
import { IAccount } from '../entities/Account';
import { Status } from '../shared/Persistence';
import useMoneeeyStore from '../shared/useMoneeeyStore';
import ImportRoute from '../routes/ImportRoute';
import SettingsRoute from '../routes/SettingsRoute';
import BudgetRoute from '../routes/BudgetRoute';
import Messages from '../utils/Messages';
import { NavigationModal } from '../shared/Navigation';

import Navbar from './base/Navbar';
import { TextNormal, TextSecondary } from './base/Text';

export const AppMenu = observer(() => {
  const { navigation, accounts, currencies, persistence, transactions } = useMoneeeyStore();
  const getAccountCurrency = (account: IAccount) => {
    const curr = currencies.byUuid(account.currency_uuid);

    return curr?.short || curr?.name || '?';
  };

  const iconProps = {
    style: { width: '1.2em', height: '1.2em' },
  };

  const activeAccounts = accounts.allNonPayees.filter((t) => t.archived !== true);
  const unclassified = transactions.viewAllUnclassified().length;

  return (
    <Navbar
      data-test-id='appMenu'
      header={Messages.menu.title}
      items={[
        {
          key: 'dashboard',
          label: Messages.menu.dashboard,
          icon: <ClipboardDocumentIcon {...iconProps} />,
          onClick: () => navigation.navigate(HomeRoute.url()),
          visible: activeAccounts.length > 0,
        },
        {
          key: 'transactions',
          label: Messages.menu.transactions,
          icon: <CurrencyDollarIcon {...iconProps} />,
          visible: activeAccounts.length > 0,
          onClick: () => navigation.navigate(AccountRoute.accountUrlForAll()),
          children: [
            ...activeAccounts
              .sort((a, b) => a.currency_uuid?.localeCompare(b.currency_uuid))
              .map((acct) => ({
                key: `account_${acct._id || ''}`,
                label: `${getAccountCurrency(acct)} ${acct.name}`,
                customLabel: (
                  <TextNormal>
                    <TextSecondary>{getAccountCurrency(acct)}</TextSecondary> {acct.name}
                  </TextNormal>
                ),
                onClick: () => navigation.navigate(AccountRoute.accountUrl(acct)),
              })),
            {
              key: 'all',
              label: Messages.menu.all_transactions,
              onClick: () => navigation.navigate(AccountRoute.accountUrlForAll()),
            },
            {
              key: 'unassigned',
              label: Messages.menu.unassigned(unclassified),
              onClick: () => navigation.navigate(AccountRoute.accountUrlForUnclassified()),
              visible: unclassified > 0,
            },
            {
              key: 'import',
              label: Messages.menu.import,
              onClick: () => navigation.navigate(ImportRoute.url()),
            },
          ],
        },
        {
          key: 'budget',
          label: Messages.menu.budget,
          icon: <EnvelopeIcon {...iconProps} />,
          onClick: () => navigation.navigate(BudgetRoute.url()),
          visible: transactions.all.length > 0,
        },
        {
          key: 'reports',
          label: Messages.menu.reports,
          icon: <ChartPieIcon {...iconProps} />,
          onClick: () => navigation.navigate(ReportsRoute.url()),
          visible: transactions.all.length > 0,
        },
        {
          key: 'settings',
          label: Messages.menu.settings,
          icon: <Cog6ToothIcon {...iconProps} />,
          onClick: () => navigation.navigate(SettingsRoute.url()),
          children: [
            {
              key: 'settings_general',
              label: Messages.menu.preferences,
              onClick: () => navigation.navigate(SettingsRoute.url()),
            },
            {
              key: 'settings_currencies',
              label: Messages.menu.currencies,
              onClick: () => navigation.navigate(CurrencySettingsRoute.url()),
            },
            {
              key: 'settings_accounts',
              label: Messages.menu.accounts,
              onClick: () => navigation.navigate(AccountSettingsRoute.url()),
            },
            {
              key: 'settings_payees',
              label: Messages.menu.payees,
              onClick: () => navigation.navigate(PayeeSettingsRoute.url()),
            },
          ],
        },
        {
          key: 'settings_landing',
          label: Messages.menu.start_tour,
          onClick: () => navigation.openModal(NavigationModal.LANDING),
        },
        {
          key: 'sync',
          label: Messages.menu.sync[persistence.status],
          icon:
            persistence.status === Status.ONLINE ? (
              <PlayCircleIcon color='green' {...iconProps} />
            ) : (
              <StopCircleIcon color='red' {...iconProps} />
            ),
          onClick: () => navigation.openModal(NavigationModal.SYNC),
        },
      ]}
    />
  );
});

export default AppMenu;
