import { ReactNode, createContext, useContext, useMemo, useState } from 'react';

import useMoneeeyStore from '../../shared/useMoneeeyStore';

import TourModal from './TourModal';
import TourSteps from './TourSteps';

export interface TourStep {
  content: string;
  action: (tour: TourClientType) => void;
  canGoNextStep?: () => boolean;
}

const TourClient = () => {
  const moneeeyStore = useMoneeeyStore();
  const [step, setStep] = useState(0);
  const [open, setOpen] = useState(false);
  const steps = useMemo(() => TourSteps(moneeeyStore), []);

  return {
    setStep(newStepp: number) {
      const newStep = Math.max(Math.min(newStepp, steps.length), 0);
      steps[newStep].action(this);
      setStep(newStep);
    },
    open() {
      setOpen(true);
      setStep(0);
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

const MoneeeyTourProvider = ({ children }: { children: ReactNode | ReactNode[] }) => {
  return (
    <Context.Provider value={TourClient()}>
      {children}
      <TourModal />
    </Context.Provider>
  );
};

const useMoneeeyTour = (): TourClientType => useContext(Context);

export { useMoneeeyTour, MoneeeyTourProvider, MoneeeyTourProvider as default };
