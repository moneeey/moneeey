import { Typography } from 'antd'
import { BaseType } from 'antd/lib/typography/Base'
import { ReactNode } from 'react'

interface TextProps {
  children: string | ReactNode | ReactNode[]
  className?: string
}

interface BaseTextProps extends TextProps {
  type?: string
}

const BaseText = (type?: string) =>
  function Text({ children, className }: BaseTextProps) {
    return (
      <Typography.Text type={type as BaseType} className={className}>
        {children}
      </Typography.Text>
    )
  }

const NormalText = BaseText()
const SecondaryText = BaseText('secondary')
const DangerText = BaseText('danger')
const WarningText = BaseText('warning')
const SuccessText = BaseText('success')

export { NormalText, SecondaryText, DangerText, WarningText, SuccessText }
