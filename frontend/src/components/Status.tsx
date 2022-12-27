import { XMarkIcon } from '@heroicons/react/24/outline';
import { ReactNode, useState } from 'react';

import './Status.less';

interface StatusProps {
  type: 'error' | 'success' | 'info' | 'warning';
  children: string | ReactNode | ReactNode[];
}

const Status = ({ type, children }: StatusProps) => {
  const [dismissed, setDismiss] = useState(false);

  return dismissed ? (
    false
  ) : (
    <p className={`mn-status mn-status-${type}`} onClick={() => setDismiss(true)}>
      {children}
      <span className='close'>
        <XMarkIcon />
      </span>
    </p>
  );
};

export type { StatusProps };

export { Status };
