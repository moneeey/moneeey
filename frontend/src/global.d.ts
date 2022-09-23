import 'antd'

declare module 'antd' {
  export declare type ButtonProps = Partial<
    { ['data-test-id']: string } & AnchorButtonProps & NativeButtonProps
  >
}
