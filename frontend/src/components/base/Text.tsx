import { ReactNode } from 'react';

import './Text.less';

type BaseType = 'title' | 'subtitle' | 'normal' | 'secondary' | 'danger' | 'warning' | 'success';

interface TextProps {
  children: string | ReactNode | ReactNode[];
  className?: string;
}

const BaseText = (type: BaseType) =>
  function Text({ children, className }: TextProps) {
    return <span className={`mn-text-${type} ${className || ''}`}>{children}</span>;
  };

const TextTitle = BaseText('title');
const TextNormal = BaseText('normal');
const TextSecondary = BaseText('secondary');
const TextDanger = BaseText('danger');
const TextWarning = BaseText('warning');
const TextSuccess = BaseText('success');

export { TextTitle, TextNormal, TextSecondary, TextDanger, TextWarning, TextSuccess };
