import { ReactNode } from 'react';

import './Text.less';

interface TextProps {
  children: string | ReactNode | ReactNode[];
  className?: string;
}

type BaseElementType = Extract<keyof JSX.IntrinsicElements, 'p' | 'span' | 'h1' | 'h2'>;
type BaseType = 'title' | 'subtitle' | 'normal' | 'paragraph' | 'secondary' | 'danger' | 'warning' | 'success';

const BaseText = (type: BaseType, ElementTyp: BaseElementType) =>
  function Text({ children, className }: TextProps) {
    return <ElementTyp className={`mn-text-${type} ${className || ''}`}>{children}</ElementTyp>;
  };

const TextTitle = BaseText('title', 'h1');
const TextSubtitle = BaseText('subtitle', 'h2');
const TextParagraph = BaseText('paragraph', 'p');
const TextNormal = BaseText('normal', 'span');
const TextSecondary = BaseText('secondary', 'span');
const TextDanger = BaseText('danger', 'span');
const TextWarning = BaseText('warning', 'span');
const TextSuccess = BaseText('success', 'span');

export { TextTitle, TextSubtitle, TextParagraph, TextNormal, TextSecondary, TextDanger, TextWarning, TextSuccess };
