import {
	Bars3Icon,
	ComputerDesktopIcon,
	TableCellsIcon,
} from "@heroicons/react/24/outline";
import { type ReactNode, useEffect, useState } from "react";

import useMessages from "../utils/Messages";
import {
	TABLE_DENSITY_CHANGE_EVENT,
	type TableDensityMode,
	getTableDensityMode,
	setTableDensityMode,
} from "../utils/useTableDensity";

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

	const DensityOption = ({
		icon,
		value,
		label,
	}: { icon: ReactNode; value: TableDensityMode; label: string }) => {
		const isActive = mode === value;
		return (
			<i
				data-testid={`tableDensitySwitcher_${value}`}
				title={label}
				className={`inline-block h-6 w-6 rounded-xl hover:ring-4 ring-secondary-500 ${
					isActive ? "ring-4" : ""
				}`}
				onClick={() => selectMode(value)}
				onKeyDown={() => selectMode(value)}
			>
				{icon}
			</i>
		);
	};

	return (
		<div className="flex flex-col justify-center items-center gap-2">
			<p>{Messages.settings.select_table_density}</p>
			<div className="flex flex-row justify-center gap-4">
				<DensityOption
					icon={<Bars3Icon />}
					value="compact"
					label={Messages.settings.table_density_compact}
				/>
				<DensityOption
					icon={<ComputerDesktopIcon />}
					value="auto"
					label={Messages.settings.table_density_auto}
				/>
				<DensityOption
					icon={<TableCellsIcon />}
					value="full"
					label={Messages.settings.table_density_full}
				/>
			</div>
		</div>
	);
}
