import { MouseEventHandler } from 'react';

interface TagProps {
  title: string;
  color?: string;
  onClick?: MouseEventHandler<HTMLSpanElement>;
  onMouseOver?: () => void;
  onMouseOut?: () => void;
}

const contrastColor = (hexcolor: string) => {
  const r = parseInt(hexcolor.substr(0, 2), 16);
  const g = parseInt(hexcolor.substr(2, 2), 16);
  const b = parseInt(hexcolor.substr(4, 2), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;

  return yiq >= 128 ? 'black' : 'white';
};

const Tag = (props: TagProps) => (
  <span
    className='m-0 mr-1 p-1'
    {...props}
    style={{
      backgroundColor: props.color,
      color: contrastColor(props.color || '#000000'),
      borderColor: props.color,
    }}>
    {props.title}
  </span>
);

export default Tag;
