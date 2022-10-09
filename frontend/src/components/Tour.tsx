import { StepType, TourProps, TourProvider, useTour } from '@reactour/tour';
import { isEmpty } from 'lodash';
import { MutableRefObject, ReactNode, useRef } from 'react';

import AccountRoute from '../routes/AccountRoute';
import { AccountSettingsRoute } from '../routes/AccountSettingsRoute';
import BudgetRoute from '../routes/BudgetRoute';
import { CurrencySettingsRoute } from '../routes/CurrencySettingsRoute';
import ImportRoute from '../routes/ImportRoute';
import MoneeeyStore from '../shared/MoneeeyStore';
import useMoneeeyStore from '../shared/useMoneeeyStore';
import Messages from '../utils/Messages';

const TourSteps = function (
  { navigation, accounts, budget }: MoneeeyStore,
  tourRef: MutableRefObject<TourProps | undefined>
): StepType[] {
  const navigateTo = (url: string) => navigation.navigate(url);
  const highlight = (area: string) => ({
    selector: area,
    resizeObservables: [area],
  });
  const content = (text: string) => <>{text}</>;

  const goStepBack = () => tourRef.current && tourRef.current.setCurrentStep(tourRef.current.currentStep - 1);

  return [
    {
      ...highlight('.tableEditor'),
      content: content(Messages.tour.edit_currencies),
      action: () => navigateTo(CurrencySettingsRoute.url()),
    },
    {
      ...highlight('.tableEditor'),
      content: content(Messages.tour.create_accounts),
      action: () => navigateTo(AccountSettingsRoute.url()),
    },
    {
      ...highlight('.budgetArea'),
      content: content(Messages.tour.create_budgets),
      action: () => {
        if (isEmpty(accounts.all)) {
          navigation.warning(Messages.tour.please_create_account);
          goStepBack();
        } else {
          navigateTo(BudgetRoute.url());
        }
      },
      position: 'bottom',
    },
    {
      ...highlight('.tableEditor'),
      content: content(Messages.tour.insert_transactions),
      action: () => {
        if (isEmpty(budget.all)) {
          navigation.warning(Messages.tour.please_create_budget);
          goStepBack();
        } else {
          navigateTo(AccountRoute.accountUrlForUnclassified());
        }
      },
    },
    {
      ...highlight('.importArea'),
      content: content(Messages.tour.import),
      action: () => navigateTo(ImportRoute.url()),
    },
    {
      ...highlight('.importArea'),
      content: content(Messages.tour.your_turn),
      action: () => navigateTo(AccountRoute.accountUrlForUnclassified()),
    },
  ];
};

const MoneeeyTourProvider = ({ children }: { children: ReactNode | ReactNode[] }) => {
  const moneeeyStore = useMoneeeyStore();
  const tourRef = useRef<TourProps>();
  const TourRefHolder = () => {
    tourRef.current = useTour();

    return <>{children}</>;
  };

  return (
    <TourProvider
      steps={TourSteps(moneeeyStore, tourRef)}
      styles={{
        popover: (base) => ({
          ...base,
          backgroundColor: '#141414',
          color: '#FAFAFA',
          whiteSpace: 'pre-wrap',
        }),
        maskWrapper: (base) => ({
          ...base,
          backgroundColor: 'transparent',
        }),
      }}>
      <TourRefHolder />
    </TourProvider>
  );
};

const useMoneeeyTour = () => {
  const tour = useTour();

  return {
    open: () => {
      tour.setCurrentStep(0);
      tour.setIsOpen(true);
    },
  };
};

export { TourSteps, useMoneeeyTour, MoneeeyTourProvider, MoneeeyTourProvider as default };
