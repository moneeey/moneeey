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

const TitleText = BaseText('', AntdTitle);
const NormalText = BaseText();
const SecondaryText = BaseText('secondary');
const DangerText = BaseText('danger');
const WarningText = BaseText('warning');
const SuccessText = BaseText('success');

export { TitleText, NormalText, SecondaryText, DangerText, WarningText, SuccessText };
