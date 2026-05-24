import { TabsContent, TabsHeader } from "../../components/base/Tabs";

import useMessages from "../../utils/Messages";

import AccountBalanceReport from "./AccountBalanceReport";
import BudgetVsActualReport from "./BudgetVsActualReport";
import CashFlowReport from "./CashFlowReport";
import IncomeVsExpensesReport from "./IncomeVsExpensesReport";
import NetWorthReport from "./NetWorthReport";
import PayeeBalanceReport from "./PayeeBalanceReport";
import RecurringReport from "./RecurringReport";
import TagExpensesReport from "./TagExpensesReport";
import TagExplorerReport from "./TagExplorerReport";
import WealthGrowReport from "./WealthGrowReport";

const availableReports = (Messages: ReturnType<typeof useMessages>) => [
	{
		label: Messages.reports.net_worth,
		key: Messages.reports.net_worth,
		children: <NetWorthReport />,
	},
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
		label: Messages.reports.tag_explorer,
		key: Messages.reports.tag_explorer,
		children: <TagExplorerReport />,
	},
	{
		label: Messages.reports.income_vs_expenses,
		key: Messages.reports.income_vs_expenses,
		children: <IncomeVsExpensesReport />,
	},
	{
		label: Messages.reports.budget_vs_actual,
		key: Messages.reports.budget_vs_actual,
		children: <BudgetVsActualReport />,
	},
	{
		label: Messages.reports.recurring,
		key: Messages.reports.recurring,
		children: <RecurringReport />,
	},
	{
		label: Messages.reports.cash_flow,
		key: Messages.reports.cash_flow,
		children: <CashFlowReport />,
	},
	{
		label: Messages.reports.wealth_growth,
		key: Messages.reports.wealth_growth,
		children: <WealthGrowReport />,
	},
];

export const ReportsHeader = () => {
	const Messages = useMessages();
	return <TabsHeader testId="reportTabs" items={availableReports(Messages)} />;
};

const Reports = () => {
	const Messages = useMessages();
	return <TabsContent testId="reportTabs" items={availableReports(Messages)} />;
};

export default Reports;
