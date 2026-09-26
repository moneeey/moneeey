import { observer } from "mobx-react-lite";
import { useEffect } from "react";
import { NavigationModal } from "../shared/Navigation";
import useMoneeeyStore from "../shared/useMoneeeyStore";

export const isEditableElement = (el: Element | null): boolean => {
	if (!el) return false;
	const tagName = el.tagName;
	if (
		tagName === "INPUT" ||
		tagName === "TEXTAREA" ||
		tagName === "SELECT" ||
		(el as HTMLElement).isContentEditable
	) {
		return true;
	}
	if (el.getAttribute("role") === "combobox") {
		return true;
	}
	if (el.closest?.(".mn-select, [role='combobox'], [contenteditable='true']")) {
		return true;
	}
	return false;
};

const GlobalHotkeys = observer(() => {
	const { navigation } = useMoneeeyStore();

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			const active = document.activeElement;
			const isEditing = isEditableElement(active);

			// Command Palette: Cmd+K / Ctrl+K
			if (
				(e.metaKey || e.ctrlKey) &&
				!e.shiftKey &&
				!e.altKey &&
				e.key.toLowerCase() === "k"
			) {
				e.preventDefault();
				if ((navigation.modal as string) === "COMMAND_PALETTE") {
					navigation.closeModal();
				} else {
					navigation.openModal("COMMAND_PALETTE" as unknown as NavigationModal);
				}
				return;
			}

			// New Transaction: N (when not in an input, no modifiers, and no modal is open)
			if (
				!e.metaKey &&
				!e.ctrlKey &&
				!e.altKey &&
				(e.key === "n" || e.key === "N")
			) {
				if (!isEditing && navigation.modal === NavigationModal.NONE) {
					e.preventDefault();
					navigation.openModal(NavigationModal.NEW_TRANSACTION);
				}
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => {
			window.removeEventListener("keydown", handleKeyDown);
		};
	}, [navigation]);

	return null;
});

export default GlobalHotkeys;
