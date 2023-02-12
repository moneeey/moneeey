import {
    ArrowDownOnSquareStackIcon,
    BookmarkSlashIcon,
    BookOpenIcon,
  ChartPieIcon,
  ClipboardDocumentIcon,
  Cog6ToothIcon,
  CurrencyDollarIcon,
  EnvelopeIcon,
  PlayCircleIcon,
  QuestionMarkCircleIcon,
  StopCircleIcon,
  UsersIcon,
  WalletIcon,
  WrenchScrewdriverIcon,
} from '@heroicons/react/24/outline';
import { observer } from 'mobx-react';

import favicon from '../../favicon.svg';

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
import { useRouteActive } from '../routes/RouteRenderer';

export const AppMenu = observer(() => {
  const { navigation, accounts, currencies, persistence, transactions } = useMoneeeyStore();
  const routeActive = useRouteActive()
  const getAccountCurrency = (account: IAccount) => {
    const curr = currencies.byUuid(account.currency_uuid);

    return curr?.short || curr?.name || '?';
  };

  const iconProps = { className: 'icon-small', };

  const activeAccounts = accounts.allNonPayees.filter((t) => t.archived !== true);
  const unclassified = transactions.viewAllUnclassified().length;

  const routeLink = (url: string) => ({
    onClick: () => navigation.navigate(url),
    isActive: !!routeActive(url),
  })

  const modalLink = (modal: NavigationModal) => ({
    onClick: () => navigation.openModal(modal),
    isActive: navigation.modal === modal,
  })

  return (
    <Navbar
      data-test-id='appMenu'
      header={
        <span>
          <img src={favicon} {...iconProps} /> {Messages.menu.title}
        </span>
      }
      items={[
        {
          key: 'dashboard',
          label: Messages.menu.dashboard,
          icon: <ClipboardDocumentIcon {...iconProps} />,
          visible: activeAccounts.length > 0,
          ...routeLink(HomeRoute.url()),
        },
        {
          key: 'transactions',
          label: Messages.menu.transactions,
          icon: <CurrencyDollarIcon {...iconProps} />,
          visible: activeAccounts.length > 0,
          ...routeLink(AccountRoute.accountUrlForAll()),
          isActive: false,
          children: [
            ...activeAccounts
              .sort((a, b) => a.currency_uuid?.localeCompare(b.currency_uuid))
              .map((acct) => ({
                key: `account_${acct._id || ''}`,
                label: `${getAccountCurrency(acct)} ${acct.name}`,
                icon: <WalletIcon {...iconProps} />,
                customLabel: (
                  <TextNormal>
                    <TextSecondary>{getAccountCurrency(acct)}</TextSecondary> {acct.name}
                  </TextNormal>
                ),
                ...routeLink(AccountRoute.accountUrl(acct)),
              })),
            {
              key: 'all',
              icon: <BookOpenIcon {...iconProps} />,
              label: Messages.menu.all_transactions,
              ...routeLink(AccountRoute.accountUrlForAll()),
            },
            {
              key: 'unassigned',
              icon: <BookmarkSlashIcon {...iconProps} />,
              label: Messages.menu.unassigned(unclassified),
              visible: unclassified > 0,
              ...routeLink(AccountRoute.accountUrlForUnclassified()),
            },
            {
              key: 'import',
              icon: <ArrowDownOnSquareStackIcon {...iconProps} />,
              label: Messages.menu.import,
              ...routeLink(ImportRoute.url()),
            },
          ],
        },
        {
          key: 'budget',
          label: Messages.menu.budget,
          icon: <EnvelopeIcon {...iconProps} />,
          visible: transactions.all.length > 0,
          ...routeLink(BudgetRoute.url()),
        },
        {
          key: 'reports',
          label: Messages.menu.reports,
          icon: <ChartPieIcon {...iconProps} />,
          visible: transactions.all.length > 0,
          ...routeLink(ReportsRoute.url()),
        },
        {
          key: 'settings',
          label: Messages.menu.settings,
          icon: <Cog6ToothIcon {...iconProps} />,
          ...routeLink(SettingsRoute.url()),
          isActive: false,
          children: [
            {
              key: 'settings_general',
              label: Messages.menu.preferences,
              icon: <WrenchScrewdriverIcon {...iconProps } />,
              ...routeLink(SettingsRoute.url()),
            },
            {
              key: 'settings_currencies',
              label: Messages.menu.currencies,
              icon: <CurrencyDollarIcon {...iconProps } />,
              ...routeLink(CurrencySettingsRoute.url()),
            },
            {
              key: 'settings_accounts',
              label: Messages.menu.accounts,
                icon: <WalletIcon {...iconProps} />,
              ...routeLink(AccountSettingsRoute.url()),
            },
            {
              key: 'settings_payees',
              label: Messages.menu.payees,
              icon: <UsersIcon {...iconProps } />,
              ...routeLink(PayeeSettingsRoute.url()),
            },
          ],
        },
        {
          key: 'settings_landing',
          label: Messages.menu.start_tour,
          icon: <QuestionMarkCircleIcon {...iconProps} />,
          ...modalLink(NavigationModal.LANDING),
        },
        {
          key: 'sync',
          label: `${Messages.modal.sync} ${Messages.menu.sync[persistence.status]}`,
          icon:
            persistence.status === Status.ONLINE ? (
              <PlayCircleIcon color='green' {...iconProps} />
            ) : (
              <StopCircleIcon color='red' {...iconProps} />
            ),
          ...modalLink(NavigationModal.SYNC),
        },
      ]}
    />
  );
});

export default AppMenu;
