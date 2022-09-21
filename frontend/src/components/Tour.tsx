import { StepType, TourProps, TourProvider, useTour } from '@reactour/tour'
import { isEmpty } from 'lodash'
import { MutableRefObject, ReactNode, useRef } from 'react'
import { AccountRoute } from '../routes/AccountRoute'
import { AccountSettingsRoute } from '../routes/AccountSettingsRoute'
import { BudgetRoute } from '../routes/BudgetRoute'
import { CurrencySettingsRoute } from '../routes/CurrencySettingsRoute'
import { ImportRoute } from '../routes/ImportRoute'
import MoneeeyStore from '../shared/MoneeeyStore'
import useMoneeeyStore from '../shared/useMoneeeyStore'
import Messages from '../utils/Messages'

function TourSteps(
  { navigation, accounts }: MoneeeyStore,
  tourRef: MutableRefObject<TourProps | undefined>
): StepType[] {
  const navigateTo = (url: string) => navigation.navigate(url)
  const highlight = (area: string) => ({
    selector: area,
    resizeObservables: [area],
  })
  const content = (text: string) => (
    <p style={{ color: 'black', whiteSpace: 'pre-wrap' }}>{text}</p>
  )
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
        if (isEmpty(accounts.all) && tourRef.current) {
          tourRef.current.setCurrentStep(tourRef.current.currentStep - 1)
        } else {
          navigateTo(BudgetRoute.url())
        }
      },
    },
    {
      ...highlight('.tableEditor'),
      content: content(Messages.tour.insert_transactions),
      action: () => navigateTo(AccountRoute.accountUrlForUnclassified()),
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
  ]
}

const MoneeeyTourProvider = ({
  children,
}: {
  children: ReactNode | ReactNode[]
}) => {
  const moneeeyStore = useMoneeeyStore()
  const tourRef = useRef<TourProps>()
  const TourRefHolder = () => {
    tourRef.current = useTour()
    return <>{children}</>
  }
  return (
    <TourProvider
      steps={TourSteps(moneeeyStore, tourRef)}
      styles={{
        maskWrapper: (base) => ({
          ...base,
          color: '#AFAFAF',
        }),
      }}
    >
      <TourRefHolder />
    </TourProvider>
  )
}

const useMoneeeyTour = () => {
  const tour = useTour()
  return {
    open: () => {
      tour.setCurrentStep(0)
      tour.setIsOpen(true)
    },
  }
}

export {
  TourSteps,
  useMoneeeyTour,
  MoneeeyTourProvider,
  MoneeeyTourProvider as default,
}
