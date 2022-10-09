import { Tag as AntdTag } from 'antd';
import { MouseEventHandler } from 'react';

interface TagProps {
  title: string;
  color?: string;
  onClick?: MouseEventHandler<HTMLSpanElement>;
  onMouseOver?: () => void;
  onMouseOut?: () => void;
}

const Tag = (props: TagProps) => <AntdTag {...props}>{props.title}</AntdTag>;

export default Tag;
