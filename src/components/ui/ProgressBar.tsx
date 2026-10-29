import type {ComponentProps, CSSProperties} from 'react';

type ProgressBarProps = Omit<ComponentProps<'div'>, 'children'> & {
  fillStyle: CSSProperties;
};

/** The fill width is runtime data; its layout and theme are Tailwind recipes. */
export function ProgressBar({fillStyle, className='progress-track', ...props}: ProgressBarProps) {
  return <div {...props} className={className}><div style={fillStyle}/></div>;
}
