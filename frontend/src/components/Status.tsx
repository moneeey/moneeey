import { XMarkIcon } from '@heroicons/react/24/outline';
import { ReactNode, useState } from 'react';

import './Status.less';

interface StatusProps {
  type: 'error' | 'success' | 'info' | 'warning';
  children: string | ReactNode | ReactNode[];
  onDismiss?: () => void;
}

const Status = ({ type, children, onDismiss }: StatusProps) => {
  const [dismissed, setDismiss] = useState(false);

  const doDismiss = () => {
    setDismiss(true);
    if (onDismiss) {
      onDismiss();
    }
  };

  return dismissed ? null : (
    <p className={`mn-status mn-status-${type}`} onClick={doDismiss}>
      {children}
      <span className='close'>
        <XMarkIcon />
      </span>
    </p>
  );
};

export type { StatusProps };

export { Status };
