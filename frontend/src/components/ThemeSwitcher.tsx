import {
	ComputerDesktopIcon,
	MoonIcon,
	SunIcon,
} from "@heroicons/react/24/outline";
import { useEffect, useState } from "react";
import useMessages from "../utils/Messages";
import { StorageKind, getStorage, setStorage } from "../utils/Utils";
import SegmentedControl from "./base/SegmentedControl";

type ThemeMode = "auto" | "light" | "dark";

function getEffectiveTheme(mode: ThemeMode): "light" | "dark" {
	if (mode === "auto") {
		return window.matchMedia("(prefers-color-scheme: light)").matches
			? "light"
			: "dark";
	}
	return mode;
}

function applyTheme(mode: ThemeMode) {
	const effective = getEffectiveTheme(mode);
	document.documentElement.setAttribute("data-theme", effective);
	document.documentElement.style.backgroundColor = "";
	document.documentElement.style.color = "";
}

export default function ThemeSwitcher() {
	const [mode, setMode] = useState<ThemeMode>(
		() => getStorage("theme", "auto", StorageKind.PERMANENT) as ThemeMode,
	);

	const selectMode = (newMode: ThemeMode) => {
		setMode(newMode);
		setStorage("theme", newMode, StorageKind.PERMANENT);
		applyTheme(newMode);
	};

	useEffect(() => {
		if (mode !== "auto") return;
		const mql = window.matchMedia("(prefers-color-scheme: light)");
		const handler = () => applyTheme("auto");
		mql.addEventListener("change", handler);
		return () => mql.removeEventListener("change", handler);
	}, [mode]);

	const Messages = useMessages();

	return (
		<div className="flex flex-col items-center gap-1.5">
			<span className="text-xs uppercase tracking-wider text-muted font-medium">
				{Messages.settings.select_theme}
			</span>
			<SegmentedControl
				testId="themeSwitcher"
				value={mode}
				onChange={selectMode}
				size="sm"
				options={[
					{
						value: "light",
						icon: <SunIcon className="w-4 h-4" />,
						label: Messages.settings.theme_light,
					},
					{
						value: "auto",
						icon: <ComputerDesktopIcon className="w-4 h-4" />,
						label: Messages.settings.theme_auto,
					},
					{
						value: "dark",
						icon: <MoonIcon className="w-4 h-4" />,
						label: Messages.settings.theme_dark,
					},
				]}
			/>
		</div>
	);
}
