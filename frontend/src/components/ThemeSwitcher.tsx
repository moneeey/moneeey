import {
	ComputerDesktopIcon,
	MoonIcon,
	SunIcon,
} from "@heroicons/react/24/outline";
import { type ReactNode, useEffect, useState } from "react";
import useMessages from "../utils/Messages";
import { StorageKind, getStorage, setStorage } from "../utils/Utils";

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

	const ThemeOption = ({
		icon,
		value,
	}: { icon: ReactNode; value: ThemeMode }) => {
		const isActive = mode === value;
		return (
			<i
				data-testid={`themeSwitcher_${value}`}
				className={`inline-block h-6 w-6 rounded-xl hover:ring-3 ring-secondary-500 p-0.5 ${
					isActive ? "ring-3" : ""
				}`}
				onClick={() => selectMode(value)}
				onKeyDown={() => selectMode(value)}
			>
				{icon}
			</i>
		);
	};

	const Messages = useMessages();

	return (
		<div className="flex flex-col justify-center items-center gap-2">
			<p>{Messages.settings.select_theme}</p>
			<div className="flex flex-row justify-center gap-4">
				<ThemeOption icon={<SunIcon />} value="light" />
				<ThemeOption icon={<ComputerDesktopIcon />} value="auto" />
				<ThemeOption icon={<MoonIcon />} value="dark" />
			</div>
		</div>
	);
}
