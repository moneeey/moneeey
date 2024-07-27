import Tabs, { TabsContent, TabsHeader } from "../../components/base/Tabs";

import useMessages from "../../utils/Messages";

import AccountBalanceReport from "./AccountBalanceReport";
import IncomeVsExpensesReport from "./IncomeVsExpensesReport";
import PayeeBalanceReport from "./PayeeBalanceReport";
import TagExpensesReport from "./TagExpensesReport";
import WealthGrowReport from "./WealthGrowReport";

const availableReports = Messages => ([
  {
    label: Messages.reports.account_balance,
    key: Messages.reports.account_balance,
    children: <AccountBalanceReport />,
  },
  {
    label: Messages.reports.payee_balance,
    key: Messages.reports.payee_balance,
    children: <PayeeBalanceReport />,
  },
  {
    label: Messages.reports.tag_expenses,
    key: Messages.reports.tag_expenses,
    children: <TagExpensesReport />,
  },
  {
    label: Messages.reports.income_vs_expenses,
    key: Messages.reports.income_vs_expenses,
    children: <IncomeVsExpensesReport />,
  },
  {
    label: Messages.reports.wealth_growth,
    key: Messages.reports.wealth_growth,
    children: <WealthGrowReport />,
  },
])

export const ReportsHeader = () => {
	const Messages = useMessages();
	return (
		<TabsHeader
			testId="reportTabs"
			items={availableReports(Messages)}
		/>
	);
}

const Reports = () => {
	const Messages = useMessages();
	return (
		<TabsContent
			testId="reportTabs"
			items={availableReports(Messages)}
		/>
	);
};

export default Reports;
