import { isEmpty } from 'lodash';

import AccountRoute from '../../routes/AccountRoute';
import { AccountSettingsRoute } from '../../routes/AccountSettingsRoute';
import BudgetRoute from '../../routes/BudgetRoute';
import { CurrencySettingsRoute } from '../../routes/CurrencySettingsRoute';
import ImportRoute from '../../routes/ImportRoute';
import { IBaseEntity } from '../../shared/Entity';
import MappedStore from '../../shared/MappedStore';
import MoneeeyStore from '../../shared/MoneeeyStore';
import useMessages from '../../utils/Messages';

import { TourStep } from './Tour';

export default function TourSteps({ navigation, accounts, budget }: MoneeeyStore): TourStep[] {
  const Messages = useMessages();
  const navigateTo = (url: string) => () => navigation.navigate(url);

  const checkStoreIsNotEmpty = <T extends IBaseEntity>(store: MappedStore<T>, message: string) => {
    if (isEmpty(store.all)) {
      navigation.warning(message);

      return false;
    }

    return true;
  };

  return [
    { content: Messages.tour.edit_currencies, action: navigateTo(CurrencySettingsRoute.url()) },
    {
      content: Messages.tour.create_accounts,
      action: navigateTo(AccountSettingsRoute.url()),
      canGoNextStep: () => checkStoreIsNotEmpty(accounts, Messages.tour.please_create_account),
    },
    { content: Messages.tour.insert_transactions, action: navigateTo(AccountRoute.accountUrlForAll()) },
    {
      content: Messages.tour.create_budgets,
      action: navigateTo(BudgetRoute.url()),
      canGoNextStep: () => checkStoreIsNotEmpty(budget, Messages.tour.please_create_budget),
    },
    { content: Messages.tour.import, action: navigateTo(ImportRoute.url()) },
    { content: Messages.tour.your_turn, action: navigateTo(AccountRoute.accountUrlForAll()) },
    { content: '', action: (tour) => tour.close() },
  ];
}
