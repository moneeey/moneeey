import { AccountBalanceReport } from './AccountBalanceReport'
import { TagExpensesReport } from './TagExpensesReport'
import { WealthGrowReport } from './WealthGrowReport'

export function Reports() {
  return (
    <>
      <AccountBalanceReport />
      <TagExpensesReport />
      <WealthGrowReport />
    </>
  )
}
