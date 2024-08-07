import {
	type ReactNode,
	createContext,
	useContext,
	useEffect,
	useMemo,
	useState,
} from "react";

import useMoneeeyStore from "../../shared/useMoneeeyStore";
import useMessages from "../../utils/Messages";

import TourModal from "./TourModal";
import TourSteps from "./TourSteps";

export interface TourStep {
	content: string;
	blinkers: string[];
	action: (tour: TourClientType) => void;
	canGoNextStep?: () => boolean;
}

const TourClient = () => {
	const Messages = useMessages();
	const moneeeyStore = useMoneeeyStore();
	const [step, setStep] = useState(0);
	const [open, setOpen] = useState(false);
	const steps = useMemo(
		() =>
			TourSteps(moneeeyStore, Messages, moneeeyStore.accounts.allNonPayees[0]),
		[Messages, moneeeyStore.accounts.allNonPayees, moneeeyStore],
	);

	useEffect(() => {
		if (!open) {
			return;
		}
		const tmr = setInterval(() => {
			for (const node of document.querySelectorAll(".blink")) {
				node.classList.remove("blink");
			}
			for (const blinker of steps[step].blinkers) {
				document.querySelector(blinker)?.classList.add("blink");
			}
		}, 500);
		return () => clearTimeout(tmr);
	}, [step, steps, open]);

	return {
		setStep(newStepp: number) {
			const newStep = Math.max(Math.min(newStepp, steps.length), 0);
			steps[newStep].action(this);
			setStep(newStep);
		},
		open() {
			this.setStep(0);
			setOpen(true);
		},
		close() {
			setOpen(false);
		},
		isOpen() {
			return open;
		},
		content() {
			return steps[step].content;
		},
		prevStep() {
			this.setStep(step - 1);
		},
		nextStep() {
			const { canGoNextStep } = steps[step];
			if (!canGoNextStep || canGoNextStep()) {
				this.setStep(step + 1);
			}
		},
	};
};

type TourClientType = ReturnType<typeof TourClient>;

const Context = createContext({} as TourClientType);

const MoneeeyTourProvider = ({
	children,
}: { children: ReactNode | ReactNode[] }) => {
	return (
		<Context.Provider value={TourClient()}>
			{children}
			<TourModal />
		</Context.Provider>
	);
};

const useMoneeeyTour = (): TourClientType => useContext(Context);

export { useMoneeeyTour, MoneeeyTourProvider, MoneeeyTourProvider as default };
