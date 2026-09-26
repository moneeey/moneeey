import { useEffect, useState } from "react";
import { StorageKind, getStorage, setStorage } from "./Utils";

export const PRIVACY_MODE_STORAGE_KEY = "privacy_mode";
export const PRIVACY_MODE_CHANGE_EVENT = "privacyModeChange";

export function getPrivacyMode(): boolean {
	if (typeof window === "undefined") {
		return false;
	}
	return (
		getStorage(PRIVACY_MODE_STORAGE_KEY, "false", StorageKind.PERMANENT) ===
		"true"
	);
}

export function applyPrivacyMode(enabled: boolean) {
	if (typeof document !== "undefined") {
		if (enabled) {
			document.documentElement.setAttribute("data-privacy-mode", "true");
		} else {
			document.documentElement.removeAttribute("data-privacy-mode");
		}
	}
}

export function setPrivacyMode(enabled: boolean) {
	setStorage(PRIVACY_MODE_STORAGE_KEY, String(enabled), StorageKind.PERMANENT);
	applyPrivacyMode(enabled);
	if (typeof window !== "undefined") {
		window.dispatchEvent(new CustomEvent(PRIVACY_MODE_CHANGE_EVENT));
	}
}

export function togglePrivacyMode(): boolean {
	const next = !getPrivacyMode();
	setPrivacyMode(next);
	return next;
}

if (typeof document !== "undefined" && getPrivacyMode()) {
	applyPrivacyMode(true);
}

export default function usePrivacyMode(): boolean {
	const [privacy, setPrivacy] = useState<boolean>(getPrivacyMode);

	useEffect(() => {
		const onChange = () => setPrivacy(getPrivacyMode());
		window.addEventListener(PRIVACY_MODE_CHANGE_EVENT, onChange);
		return () => {
			window.removeEventListener(PRIVACY_MODE_CHANGE_EVENT, onChange);
		};
	}, []);

	return privacy;
}
