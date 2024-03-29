import { keys } from "lodash";
import { type ReactElement, useEffect, useState } from "react";
import {
	Bar,
	BarChart,
	CartesianGrid,
	Line,
	LineChart,
	ResponsiveContainer,
	Tooltip,
	type TooltipProps,
	XAxis,
} from "recharts";
import type { NameType } from "recharts/types/component/DefaultTooltipContent";
import type { ValueType } from "tailwindcss/types/config";

import Loading from "../../components/Loading";
import { Checkbox } from "../../components/base/Input";
import Space from "../../components/base/Space";
import { TextTitle } from "../../components/base/Text";
import type { IAccount } from "../../entities/Account";
import useMoneeeyStore from "../../shared/useMoneeeyStore";
import type { TDate } from "../../utils/Date";

import useMessages from "../../utils/Messages";

import DateGroupingSelector from "./DateGroupingSelector";
import {
	type AsyncProcessTransactionFn,
	NewReportDataMap,
	type PeriodGroup,
	PeriodGroups,
	type ReportDataMap,
	asyncProcessTransactionsForAccounts,
} from "./ReportUtils";

interface BaseReportProps {
	title: string;
	accounts: IAccount[];
	processFn: AsyncProcessTransactionFn;
	chartFn: (data: ReportDataMap, period: PeriodGroup) => ReactElement;
}

const roundCofficient = 1e5;
const roundPoint = (value: number) =>
	Math.round(value * roundCofficient) / roundCofficient;

export const BaseReport = ({
	accounts,
	processFn,
	title,
	chartFn,
}: BaseReportProps) => {
	const Messages = useMessages();
	const [data, setData] = useState(NewReportDataMap());
	const [selectedAccounts, setSelectedAccounts] = useState(accounts);
	const [period, setPeriod] = useState(PeriodGroups(Messages).Month);
	const [progress, setProgress] = useState(0);
	const moneeeyStore = useMoneeeyStore();
	useEffect(() => {
		(async () => {
			const currentData = await asyncProcessTransactionsForAccounts({
				moneeeyStore,
				accounts: selectedAccounts.map((act) => act.account_uuid),
				processFn,
				period,
				setProgress,
			});
			setProgress(0);
			for (const points of Array.from(currentData.points.values())) {
				for (const label of keys(points)) {
					points[label] = roundPoint(points[label]);
				}
			}
			setData(currentData);
		})();
	}, [moneeeyStore, processFn, period, selectedAccounts]);

	return (
		<section className="grow bg-background-800 p-4">
			<h2>{title}</h2>
			<Loading loading={progress !== 0} progress={progress}>
				<section>{chartFn(data, period)}</section>
			</Loading>
			<DateGroupingSelector setPeriod={setPeriod} period={period} />
			<Space className="flex-wrap">
				{Messages.reports.include_accounts}
				{accounts.map((account) => (
					<Checkbox
						testId={`accountVisible_${account.account_uuid}`}
						key={account.account_uuid}
						value={Boolean(
							selectedAccounts.find(
								(act) => act.account_uuid === account.account_uuid,
							),
						)}
						onChange={(checked) =>
							setSelectedAccounts(
								selectedAccounts
									.filter((act) => act.account_uuid !== account.account_uuid)
									.concat(checked ? [account] : []),
							)
						}
						placeholder={account.name}
					>
						{account.name}
					</Checkbox>
				))}
			</Space>
		</section>
	);
};

const ChartColorGenerator = () => {
	const colors = [
		"text-emerald-200 fill-emerald-200 stroke-emerald-200",
		"text-cyan-200 fill-cyan-200 stroke-cyan-200",
		"text-yellow-200 fill-yellow-200 stroke-yellow-200",
		"text-orange-200 fill-orange-200 stroke-orange-200",
		"text-violet-200 fill-violet-200 stroke-violet-200",
		"text-teal-200 fill-teal-200 stroke-teal-200",
		"text-blue-200 fill-blue-200 stroke-blue-200",
		"text-stone-200 fill-stone-200 stroke-stone-200",
		"text-green-200 fill-green-200 stroke-green-200",
		"text-fuchsia-200 fill-fuchsia-200 stroke-fuchsia-200",
		"text-lime-200 fill-lime-200 stroke-lime-200",
		"text-pink-200 fill-pink-200 stroke-pink-200",
		"text-purple-200 fill-purple-200 stroke-purple-200",
		"text-sky-200 fill-sky-200 stroke-sky-200",
		"text-slate-200 fill-slate-200 stroke-slate-200",
		"text-red-200 fill-red-200 stroke-red-200",
		"text-white-200 fill-white-200 stroke-white-200",
		"text-amber-200 fill-amber-200 stroke-amber-200",
		"text-indigo-200 fill-indigo-200 stroke-indigo-200",
	];
	let index = 0;

	return () => {
		index += 1;
		index %= colors.length;

		return colors[index];
	};
};

interface ChartRenderProps {
	columns: string[];
	rows: object[];
	width: number;
	height: number;
}

const BaseChart = ({
	data,
	Chart,
}: {
	data: ReportDataMap;
	Chart: (props: ChartRenderProps) => ReactElement;
}) => {
	const columns = Array.from(data.columns.keys());
	const rows = Array.from(data.points.entries()).map(([date, points]) => ({
		date,
		...points,
	}));

	return (
		<ResponsiveContainer width="100%" height="100%" minHeight="42em">
			<Chart width={0} height={0} columns={columns} rows={rows} />
		</ResponsiveContainer>
	);
};

const CustomTooltip = ({
	active,
	payload,
	label,
}: TooltipProps<ValueType, NameType>) => {
	if (active && payload && payload.length) {
		return (
			<div className="rounded bg-background-400 p-2">
				<TextTitle>{label}</TextTitle>
				{payload.map((pld) => (
					<p
						key={pld.name}
						className={(pld as unknown as { className: string }).className}
					>
						{pld.name}: {pld.value}
					</p>
				))}
			</div>
		);
	}

	return null;
};

const BaseTooltip = (xFormatter: (v: TDate) => string) => (
	<Tooltip
		content={CustomTooltip}
		labelFormatter={(label: string) => (
			<span className="text-black">{xFormatter(label)}</span>
		)}
	/>
);

export const BaseColumnChart = ({
	data,
	xFormatter,
}: {
	data: ReportDataMap;
	xFormatter: (v: TDate) => string;
}) => (
	<BaseChart
		data={data}
		Chart={(props: ChartRenderProps) => {
			const nextColor = ChartColorGenerator();

			return (
				<BarChart
					width={props.width}
					height={props.height}
					data={props.rows}
					margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
				>
					<XAxis dataKey="date" tickFormatter={xFormatter} />
					<CartesianGrid stroke="#fafafa" strokeDasharray="3 3" />
					{BaseTooltip(xFormatter)}
					{props.columns.map((column) => (
						<Bar
							key={column}
							type="monotone"
							dataKey={column}
							className={nextColor()}
							stackId="onlyonestackintheworldaaaaaaa"
						/>
					))}
				</BarChart>
			);
		}}
	/>
);

export const BaseLineChart = ({
	data,
	xFormatter,
}: {
	data: ReportDataMap;
	xFormatter: (v: TDate) => string;
}) => (
	<BaseChart
		data={data}
		Chart={(props: ChartRenderProps) => {
			const nextColor = ChartColorGenerator();

			return (
				<LineChart
					width={props.width}
					height={props.height}
					data={props.rows}
					margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
				>
					<XAxis dataKey="date" tickFormatter={xFormatter} />
					{BaseTooltip(xFormatter)}
					<CartesianGrid stroke="#fafafa" strokeDasharray="3 3" />
					{props.columns.map((column, index) => (
						<Line
							key={column}
							type="monotone"
							dataKey={column}
							strokeWidth={2}
							className={nextColor()}
							yAxisId={index}
						/>
					))}
				</LineChart>
			);
		}}
	/>
);
