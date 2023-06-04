import {
  ArrowDownOnSquareStackIcon,
  Bars3Icon,
  BookOpenIcon,
  BookmarkSlashIcon,
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
import { Dispatch, SetStateAction, useState } from 'react';

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

import RouteRenderer from '../routes/RouteRenderer';
import MoneeeyStore from '../shared/MoneeeyStore';

import Navbar from './base/Navbar';
import { TextNormal, TextSecondary, TextTitle } from './base/Text';
import Icon, { FavIcon } from './base/Icon';

const Menu = observer(() => {
  const { navigation, accounts, currencies, persistence, transactions } = useMoneeeyStore();

  const getAccountCurrency = (account: IAccount) => {
    const curr = currencies.byUuid(account.currency_uuid);

    return curr?.short || curr?.name || '?';
  };

  const activeAccounts = accounts.allNonPayees.filter((t) => t.archived !== true);
  const unclassified = transactions.viewAllUnclassified().length;
  const activePath = navigation.currentPath;
  const hasTransactions = transactions.all.length > 0;

  const routeLink = (url: string) => ({
    onClick: () => navigation.navigate(url),
    isActive: activePath === url,
  });

  const modalLink = (modal: NavigationModal) => ({
    onClick: () => navigation.openModal(modal),
    isActive: navigation.modal === modal,
  });

  return (
    <Navbar
      className='px-2'
      data-test-id='appMenu'
      items={[
        {
          key: 'dashboard',
          label: Messages.menu.dashboard,
          icon: <ClipboardDocumentIcon />,
          visible: activeAccounts.length > 0,
          ...routeLink(HomeRoute.url()),
        },
        {
          key: 'transactions',
          label: Messages.menu.transactions,
          icon: <CurrencyDollarIcon />,
          visible: activeAccounts.length > 0,
          ...routeLink(AccountRoute.accountUrlForAll()),
          isActive: false,
          children: [
            ...activeAccounts
              .sort((a, b) => a.currency_uuid?.localeCompare(b.currency_uuid))
              .map((acct) => ({
                key: `account_${acct._id || ''}`,
                label: `${getAccountCurrency(acct)} ${acct.name}`,
                icon: <WalletIcon />,
                customLabel: (
                  <TextNormal>
                    <TextSecondary>{getAccountCurrency(acct)}</TextSecondary> {acct.name}
                  </TextNormal>
                ),
                ...routeLink(AccountRoute.accountUrl(acct)),
              })),
            {
              key: 'all',
              icon: <BookOpenIcon />,
              label: Messages.menu.all_transactions,
              ...routeLink(AccountRoute.accountUrlForAll()),
            },
            {
              key: 'unassigned',
              icon: <BookmarkSlashIcon />,
              label: Messages.menu.unassigned(unclassified),
              visible: unclassified > 0,
              ...routeLink(AccountRoute.accountUrlForUnclassified()),
            },
            {
              key: 'import',
              icon: <ArrowDownOnSquareStackIcon />,
              label: Messages.menu.import,
              ...routeLink(ImportRoute.url()),
            },
          ],
        },
        {
          key: 'budget',
          label: Messages.menu.budget,
          icon: <EnvelopeIcon />,
          visible: hasTransactions,
          ...routeLink(BudgetRoute.url()),
        },
        {
          key: 'reports',
          label: Messages.menu.reports,
          icon: <ChartPieIcon />,
          visible: hasTransactions,
          ...routeLink(ReportsRoute.url()),
        },
        {
          key: 'settings',
          label: Messages.menu.settings,
          icon: <Cog6ToothIcon />,
          ...routeLink(SettingsRoute.url()),
          isActive: false,
          children: [
            {
              key: 'settings_general',
              label: Messages.menu.preferences,
              icon: <WrenchScrewdriverIcon />,
              ...routeLink(SettingsRoute.url()),
            },
            {
              key: 'settings_currencies',
              label: Messages.menu.currencies,
              icon: <CurrencyDollarIcon />,
              ...routeLink(CurrencySettingsRoute.url()),
            },
            {
              key: 'settings_accounts',
              label: Messages.menu.accounts,
              icon: <WalletIcon />,
              ...routeLink(AccountSettingsRoute.url()),
            },
            {
              key: 'settings_payees',
              label: Messages.menu.payees,
              icon: <UsersIcon />,
              ...routeLink(PayeeSettingsRoute.url()),
            },
          ],
        },
        {
          key: 'settings_landing',
          label: Messages.menu.start_tour,
          icon: <QuestionMarkCircleIcon />,
          ...modalLink(NavigationModal.LANDING),
        },
        {
          key: 'sync',
          label: `${Messages.modal.sync} ${Messages.menu.sync[persistence.status]}`,
          icon:
            persistence.status === Status.ONLINE ? <PlayCircleIcon color='green' /> : <StopCircleIcon color='red' />,
          ...modalLink(NavigationModal.SYNC),
        },
      ]}
    />
  );
});

const Header = ({ setExpanded }: { setExpanded: Dispatch<SetStateAction<boolean>> }) => (
  <header className='sticky left-0 right-0 top-0 z-30 bg-background-800 p-2'>
    <TextTitle className='flex flex-row items-center gap-1' onClick={() => setExpanded((value) => !value)}>
      <Icon>
        <Bars3Icon />
      </Icon>
      <FavIcon />
      {Messages.menu.title}
    </TextTitle>
  </header>
);

const Content = ({ expanded, moneeeyStore }: { expanded: boolean; moneeeyStore: MoneeeyStore }) => (
  <section className='flex grow flex-row'>
    {expanded && <Menu />}
    <section className='grow overflow-hidden p-4'>
      <RouteRenderer root_route={HomeRoute} app={{ moneeeyStore }} />
    </section>
  </section>
);

export default function AppMenu({ moneeeyStore }: { moneeeyStore: MoneeeyStore }) {
  const [expanded, setExpanded] = useState(true);

  return (
    <section className='flex h-screen flex-col'>
      <Header setExpanded={setExpanded} />
      <Content expanded={expanded} moneeeyStore={moneeeyStore} />
    </section>
  );
}
