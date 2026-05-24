import { observer } from "mobx-react";
import { useMemo } from "react";

import DatePicker from "../../components/base/DatePicker";
import Select from "../../components/base/Select";
import type { IAccount, TAccountUUID } from "../../entities/Account";
import useMoneeeyStore from "../../shared/useMoneeeyStore";
import {
	type TDate,
	TDateFormat,
	formatDate,
	parseDate,
} from "../../utils/Date";
import useMessages from "../../utils/Messages";

import {
	ALL_CURRENCIES,
	type IReportStateApi,
	type TCompareMode,
	type TPeriodKey,
	type TRangePreset,
} from "./useReportState";

const PRESETS: TRangePreset[] = [
	"thisMonth",
	"last30d",
	"ytd",
	"last12mo",
	"allTime",
	"custom",
];

const PERIODS: TPeriodKey[] = ["day", "week", "month", "quarter", "year"];

const COMPARE_MODES: TCompareMode[] = ["none", "prevPeriod", "prevYear"];

const presetLabel = (
	preset: TRangePreset,
	Messages: ReturnType<typeof useMessages>,
) => {
	switch (preset) {
		case "thisMonth":
			return Messages.reports.preset_this_month;
		case "last30d":
			return Messages.reports.preset_last_30d;
		case "ytd":
			return Messages.reports.preset_ytd;
		case "last12mo":
			return Messages.reports.preset_last_12mo;
		case "allTime":
			return Messages.reports.preset_all_time;
		case "custom":
			return Messages.reports.preset_custom;
	}
};

const periodLabel = (
	period: TPeriodKey,
	Messages: ReturnType<typeof useMessages>,
) => {
	switch (period) {
		case "day":
			return Messages.util.day;
		case "week":
			return Messages.util.week;
		case "month":
			return Messages.util.month;
		case "quarter":
			return Messages.util.quarter;
		case "year":
			return Messages.util.year;
	}
};

const compareLabel = (
	mode: TCompareMode,
	Messages: ReturnType<typeof useMessages>,
) => {
	switch (mode) {
		case "none":
			return Messages.reports.compare_none;
		case "prevPeriod":
			return Messages.reports.compare_prev_period;
		case "prevYear":
			return Messages.reports.compare_prev_year;
	}
};

interface ReportControlsProps {
	state: IReportStateApi;
	accounts: IAccount[];
	showCurrency?: boolean;
	showCompare?: boolean;
	showAccounts?: boolean;
}

const ReportControls = observer(
	({
		state,
		accounts,
		showCurrency = true,
		showCompare = true,
		showAccounts = true,
	}: ReportControlsProps) => {
		const Messages = useMessages();
		const moneeeyStore = useMoneeeyStore();

		const presetOptions = useMemo(
			() => PRESETS.map((p) => ({ label: presetLabel(p, Messages), value: p })),
			[Messages],
		);
		const periodOptions = useMemo(
			() => PERIODS.map((p) => ({ label: periodLabel(p, Messages), value: p })),
			[Messages],
		);
		const compareOptions = useMemo(
			() =>
				COMPARE_MODES.map((m) => ({
					label: compareLabel(m, Messages),
					value: m,
				})),
			[Messages],
		);
		const currencyOptions = useMemo(() => {
			const all = moneeeyStore.currencies.all;
			return [
				{ label: Messages.reports.all_currencies, value: ALL_CURRENCIES },
				...all.map((c) => ({
					label: c.short ? `${c.short} — ${c.name}` : c.name,
					value: c.id,
				})),
			];
		}, [moneeeyStore.currencies.all, Messages]);

		return (
			<section className="flex flex-col gap-3 rounded-md bg-background-900 p-3 md:p-4">
				<div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
					<label className="flex flex-col gap-1">
						<span className="text-sm opacity-80">
							{Messages.reports.date_range}
						</span>
						<Select
							testId="reportPresetSelector"
							placeholder={presetLabel(state.preset, Messages)}
							options={presetOptions}
							value={state.preset}
							onChange={(value) =>
								state.setPreset((value as TRangePreset) || "last12mo")
							}
						/>
					</label>
					<label className="flex flex-col gap-1">
						<span className="text-sm opacity-80">
							{Messages.reports.group_by}
						</span>
						<Select
							testId="reportPeriodSelector"
							placeholder={periodLabel(state.period, Messages)}
							options={periodOptions}
							value={state.period}
							onChange={(value) =>
								state.setPeriod((value as TPeriodKey) || "month")
							}
						/>
					</label>
					{showCurrency && (
						<label className="flex flex-col gap-1">
							<span className="text-sm opacity-80">
								{Messages.reports.currency}
							</span>
							<Select
								testId="reportCurrencySelector"
								placeholder={Messages.reports.currency}
								options={currencyOptions}
								value={state.currency}
								onChange={(value) => state.setCurrency(value || ALL_CURRENCIES)}
							/>
						</label>
					)}
					{showCompare && (
						<label className="flex flex-col gap-1">
							<span className="text-sm opacity-80">
								{Messages.reports.compare}
							</span>
							<Select
								testId="reportCompareSelector"
								placeholder={compareLabel(state.compare, Messages)}
								options={compareOptions}
								value={state.compare}
								onChange={(value) =>
									state.setCompare((value as TCompareMode) || "none")
								}
							/>
						</label>
					)}
				</div>

				{state.preset === "custom" && (
					<div className="grid grid-cols-1 gap-3 md:grid-cols-2">
						<label className="flex flex-col gap-1">
							<span className="text-sm opacity-80">
								{Messages.reports.from}
							</span>
							<DatePicker
								testId="reportFromDate"
								dateFormat={TDateFormat}
								placeholder={Messages.reports.from}
								value={state.from ? parseDate(state.from) : new Date()}
								onChange={(d: Date) =>
									state.setCustomRange(formatDate(d), state.to)
								}
							/>
						</label>
						<label className="flex flex-col gap-1">
							<span className="text-sm opacity-80">{Messages.reports.to}</span>
							<DatePicker
								testId="reportToDate"
								dateFormat={TDateFormat}
								placeholder={Messages.reports.to}
								value={state.to ? parseDate(state.to) : new Date()}
								onChange={(d: Date) =>
									state.setCustomRange(state.from, formatDate(d))
								}
							/>
						</label>
					</div>
				)}

				{showAccounts && accounts.length > 0 && (
					<div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
						<span className="text-sm opacity-80">
							{Messages.reports.include_accounts}
						</span>
						{accounts.map((account) => (
							<AccountToggle
								key={account.id}
								account={account}
								selected={
									state.accountIds.size === 0 ||
									state.accountIds.has(account.id)
								}
								onToggle={() => {
									if (state.accountIds.size === 0) {
										const next = new Set<TAccountUUID>(
											accounts.map((a) => a.id),
										);
										next.delete(account.id);
										state.setAccountIds(next);
									} else {
										state.toggleAccount(account.id);
									}
								}}
							/>
						))}
					</div>
				)}
			</section>
		);
	},
);

const AccountToggle = ({
	account,
	selected,
	onToggle,
}: {
	account: IAccount;
	selected: boolean;
	onToggle: () => void;
}) => (
	<label
		className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition ${
			selected
				? "border-primary-400 bg-primary-300/15 text-foreground"
				: "border-background-700 bg-background-800 text-foreground/70 hover:bg-background-700"
		}`}
	>
		<input
			data-testid={`accountVisible_${account.id}`}
			type="checkbox"
			className="m-0 h-3 w-3"
			checked={selected}
			onChange={onToggle}
		/>
		{account.name}
	</label>
);

export default ReportControls;

export const effectiveAccountIds = (
	accounts: IAccount[],
	selected: ReadonlySet<TAccountUUID>,
): TAccountUUID[] =>
	selected.size === 0
		? accounts.map((a) => a.id)
		: accounts.filter((a) => selected.has(a.id)).map((a) => a.id);

export const computeRangeFromData = (
	points: Map<TDate, unknown>,
): { from: TDate | null; to: TDate | null } => {
	if (points.size === 0) return { from: null, to: null };
	const keys = Array.from(points.keys()).sort();
	return { from: keys[0], to: keys[keys.length - 1] };
};
