import {
	Bars3Icon,
	ComputerDesktopIcon,
	TableCellsIcon,
} from "@heroicons/react/24/outline";
import { useEffect, useState } from "react";

import useMessages from "../utils/Messages";
import {
	TABLE_DENSITY_CHANGE_EVENT,
	type TableDensityMode,
	getTableDensityMode,
	setTableDensityMode,
} from "../utils/useTableDensity";
import SegmentedControl from "./base/SegmentedControl";

export default function TableDensitySwitcher() {
	const Messages = useMessages();
	const [mode, setMode] = useState<TableDensityMode>(getTableDensityMode);

	useEffect(() => {
		const onChange = () => setMode(getTableDensityMode());
		window.addEventListener(TABLE_DENSITY_CHANGE_EVENT, onChange);
		return () =>
			window.removeEventListener(TABLE_DENSITY_CHANGE_EVENT, onChange);
	}, []);

	const selectMode = (newMode: TableDensityMode) => {
		setMode(newMode);
		setTableDensityMode(newMode);
	};

	return (
		<div className="flex flex-col items-center gap-1.5">
			<span className="text-xs uppercase tracking-wider text-muted font-medium">
				{Messages.settings.select_table_density}
			</span>
			<SegmentedControl
				testId="tableDensitySwitcher"
				value={mode}
				onChange={selectMode}
				size="sm"
				options={[
					{
						value: "compact",
						icon: <Bars3Icon className="w-4 h-4" />,
						label: Messages.settings.table_density_compact,
					},
					{
						value: "auto",
						icon: <ComputerDesktopIcon className="w-4 h-4" />,
						label: Messages.settings.table_density_auto,
					},
					{
						value: "full",
						icon: <TableCellsIcon className="w-4 h-4" />,
						label: Messages.settings.table_density_full,
					},
				]}
			/>
		</div>
	);
}
