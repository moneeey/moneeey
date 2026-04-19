import { useEffect, useState } from "react";

import { StorageKind, getStorage, setStorage } from "./Utils";

export type TableDensityMode = "compact" | "full" | "auto";
export type TableDensity = "compact" | "full";

export const TABLE_DENSITY_STORAGE_KEY = "tableDensity";
export const TABLE_DENSITY_CHANGE_EVENT = "tableDensityChange";
export const TABLE_DENSITY_BREAKPOINT = 768;

const isTableDensityMode = (value: string): value is TableDensityMode =>
	value === "compact" || value === "full" || value === "auto";

export function getTableDensityMode(): TableDensityMode {
	const stored = getStorage(
		TABLE_DENSITY_STORAGE_KEY,
		"auto",
		StorageKind.PERMANENT,
	);
	return isTableDensityMode(stored) ? stored : "auto";
}

export function setTableDensityMode(mode: TableDensityMode) {
	setStorage(TABLE_DENSITY_STORAGE_KEY, mode, StorageKind.PERMANENT);
	if (typeof window !== "undefined") {
		window.dispatchEvent(new CustomEvent(TABLE_DENSITY_CHANGE_EVENT));
	}
}

export function resolveTableDensity(
	mode: TableDensityMode,
	windowWidth: number,
): TableDensity {
	if (mode === "compact") return "compact";
	if (mode === "full") return "full";
	return windowWidth < TABLE_DENSITY_BREAKPOINT ? "compact" : "full";
}

export default function useTableDensity(): TableDensity {
	const [mode, setMode] = useState<TableDensityMode>(getTableDensityMode);
	const [width, setWidth] = useState(() =>
		typeof window === "undefined"
			? TABLE_DENSITY_BREAKPOINT
			: window.innerWidth,
	);

	useEffect(() => {
		const onModeChange = () => setMode(getTableDensityMode());
		const onResize = () => setWidth(window.innerWidth);
		window.addEventListener(TABLE_DENSITY_CHANGE_EVENT, onModeChange);
		window.addEventListener("resize", onResize);
		return () => {
			window.removeEventListener(TABLE_DENSITY_CHANGE_EVENT, onModeChange);
			window.removeEventListener("resize", onResize);
		};
	}, []);

	return resolveTableDensity(mode, width);
}
