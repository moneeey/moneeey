import { XMarkIcon } from '@heroicons/react/24/outline';
import { ReactNode, useState } from 'react';

import Icon from './base/Icon';

export type StatusType = 'warning' | 'success' | 'info' | 'error';

export interface StatusProps {
  type: StatusType;
  children: string | ReactNode | ReactNode[];
  onDismiss?: () => void;
}

export const Status = ({ type, children, onDismiss }: StatusProps) => {
  const [dismissed, setDismiss] = useState(false);

  const doDismiss = () => {
    setDismiss(true);
    if (onDismiss) {
      onDismiss();
    }
  };

  let colors = '';
  if (type === 'warning') {
    colors = 'bg-warning-400 text-warning-50';
  } else if (type === 'error') {
    colors = 'bg-error-400 text-error-50';
  } else if (type === 'info') {
    colors = 'bg-info-400 text-info-50';
  } else if (type === 'success') {
    colors = 'bg-success-400 text-success-50';
  }

  return dismissed ? null : (
    <div className={`mb-2 rounded-lg p-2 text-sm ${colors} flex flex-row`} onClick={doDismiss}>
      <div className='grow'>{children}</div>
      <Icon>
        <XMarkIcon />
      </Icon>
    </div>
  );
};
