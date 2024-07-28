import { observer } from "mobx-react";

import { AccountKind } from "../../entities/Account";
import type MoneeeyStore from "../../shared/MoneeeyStore";
import useMoneeeyStore from "../../shared/useMoneeeyStore";

import useMessages from "../../utils/Messages";

import { keys } from "lodash";
import { baseAccountBalanceReport } from "./AccountBalanceReport";
import { BaseColumnChart, BaseReport } from "./BaseReport";

const payeeBalanceReport = (moneeeyStore: MoneeeyStore) =>
	baseAccountBalanceReport(
		moneeeyStore,
		true,
		(account) => account.kind === AccountKind.PAYEE,
	);

const PayeeBalanceReport = observer(() => {
	const Messages = useMessages();
	const moneeeyStore = useMoneeeyStore();
	const { accounts } = moneeeyStore;

	return (
		<BaseReport
			accounts={accounts.allPayees}
			processFn={payeeBalanceReport(moneeeyStore)}
			title={Messages.reports.payee_balance}
			chartFn={(data, period) => {
				const allPositiveData = { ...data };
				for (const v of allPositiveData.points.values()) {
					for (const k of keys(v)) {
						v[k] = Math.abs(v[k]);
					}
				}
				return <BaseColumnChart data={data} xFormatter={period.formatter} />;
			}}
		/>
	);
});

export default PayeeBalanceReport;
