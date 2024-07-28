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

type ColorGeneratorFn = () => string;

export const ChartColorGeneratorForColors = (colors: string[]) => {
	let index = 0;
	return () => {
		index += 1;
		index %= colors.length;
		return colors[index];
	};
};

const ChartColorGenerator = (): ColorGeneratorFn =>
	ChartColorGeneratorForColors([
		"text-emerald-600 fill-emerald-400 stroke-emerald-400",
		"text-cyan-600 fill-cyan-400 stroke-cyan-400",
		"text-yellow-600 fill-yellow-400 stroke-yellow-400",
		"text-orange-600 fill-orange-400 stroke-orange-400",
		"text-violet-600 fill-violet-400 stroke-violet-400",
		"text-teal-600 fill-teal-400 stroke-teal-400",
		"text-blue-600 fill-blue-400 stroke-blue-400",
		"text-green-600 fill-green-400 stroke-green-400",
		"text-fuchsia-600 fill-fuchsia-400 stroke-fuchsia-400",
		"text-lime-600 fill-lime-400 stroke-lime-400",
		"text-pink-600 fill-pink-400 stroke-pink-400",
		"text-purple-600 fill-purple-400 stroke-purple-400",
		"text-sky-600 fill-sky-400 stroke-sky-400",
		"text-red-600 fill-red-400 stroke-red-400",
		"text-white-600 fill-white-400 stroke-white-400",
		"text-amber-600 fill-amber-400 stroke-amber-400",
		"text-indigo-600 fill-indigo-400 stroke-indigo-400",
	]);

interface ChartRenderProps {
	columns: string[];
	rows: object[];
	width: number;
	height: number;
	colorGenerator: () => ColorGeneratorFn;
}

const BaseChart = ({
	data,
	colorGenerator,
	Chart,
}: {
	data: ReportDataMap;
	colorGenerator: () => ColorGeneratorFn;
	Chart: (props: ChartRenderProps) => ReactElement;
}) => {
	const columns = Array.from(data.columns.keys());
	const rows = Array.from(data.points.entries()).map(([date, points]) => ({
		date,
		...points,
	}));

	return (
		<ResponsiveContainer width="100%" height="100%" minHeight="42em">
			<Chart
				width={0}
				height={0}
				columns={columns}
				rows={rows}
				colorGenerator={colorGenerator}
			/>
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
			<div className="rounded bg-background-100 p-2">
				<TextTitle className="text-info-800">{label}</TextTitle>
				{payload
					.sort((a, b) => Number(b?.value) - Number(a?.value))
					.map((pld) => (
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
	colorGenerator,
	xFormatter,
}: {
	data: ReportDataMap;
	colorGenerator?: () => ColorGeneratorFn;
	xFormatter: (v: TDate) => string;
}) => (
	<BaseChart
		colorGenerator={colorGenerator || ChartColorGenerator}
		data={data}
		Chart={(props: ChartRenderProps) => {
			const nextColor = props.colorGenerator();

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
	colorGenerator,
	xFormatter,
}: {
	data: ReportDataMap;
	colorGenerator?: () => ColorGeneratorFn;
	xFormatter: (v: TDate) => string;
}) => (
	<BaseChart
		data={data}
		colorGenerator={colorGenerator || ChartColorGenerator}
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
