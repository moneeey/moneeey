import { Tabs } from 'antd'
import Messages from '../../utils/Messages'
import { AccountBalanceReport } from './AccountBalanceReport'
import { TagExpensesReport } from './TagExpensesReport'
import { WealthGrowReport } from './WealthGrowReport'

export function Reports() {
  return (
    <section className="reportsArea">
      <Tabs
        items={[
          {
            label: Messages.reports.account_balance,
            key: Messages.reports.account_balance,
            children: <AccountBalanceReport />,
          },
          {
            label: Messages.reports.tag_expenses,
            key: Messages.reports.tag_expenses,
            children: <TagExpensesReport />,
          },
          {
            label: Messages.reports.wealth_growth,
            key: Messages.reports.wealth_growth,
            children: <WealthGrowReport />,
          },
        ]}
      />
    </section>
  )
}
