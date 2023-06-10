import { ReactNode } from 'react';

interface TextProps {
  onClick?: () => void;
  children: string | ReactNode | ReactNode[];
  className?: string;
  title?: string;
}

type BaseElementType = Extract<keyof JSX.IntrinsicElements, 'p' | 'span' | 'h1' | 'h2'>;

const BaseText = (clzz: HTMLElement['className'], ElementTyp: BaseElementType) =>
  function Text({ children, className, title, onClick }: TextProps) {
    return (
      <ElementTyp className={`${clzz} ${className || ''}`} onClick={onClick} title={title}>
        {children}
      </ElementTyp>
    );
  };

const TextTitle = BaseText('text-xl', 'h1');
const TextSubtitle = BaseText('', 'h2');
const TextParagraph = BaseText('', 'p');
const TextNormal = BaseText('', 'span');
const TextSecondary = BaseText('opacity-75', 'span');
const TextDanger = BaseText('text-red', 'span');
const TextWarning = BaseText('text-yellow', 'span');
const TextSuccess = BaseText('text-green', 'span');

export { TextTitle, TextSubtitle, TextParagraph, TextNormal, TextSecondary, TextDanger, TextWarning, TextSuccess };
