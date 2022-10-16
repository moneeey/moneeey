import { Typography } from 'antd';
import { BaseType } from 'antd/lib/typography/Base';
import { ReactNode } from 'react';

const { Text: AntdText, Title: AntdTitle } = Typography;

interface TextProps {
  children: string | ReactNode | ReactNode[];
  className?: string;
}

interface BaseTextProps extends TextProps {
  type?: string;
}

const BaseText = (type?: string, ComposedElement: typeof AntdText | typeof AntdTitle = AntdText) =>
  function Text({ children, className }: BaseTextProps) {
    return (
      <ComposedElement type={type as BaseType} className={className}>
        {children}
      </ComposedElement>
    );
  };

const TextTitle = BaseText('', AntdTitle);
const TextNormal = BaseText();
const TextSecondary = BaseText('secondary');
const TextDanger = BaseText('danger');
const TextWarning = BaseText('warning');
const TextSuccess = BaseText('success');

export { TextTitle, TextNormal, TextSecondary, TextDanger, TextWarning, TextSuccess };
