import type {ComponentProps} from 'react';

type CardProps = ComponentProps<'div'> & {
  as?: 'div' | 'section' | 'article';
  variant?: 'surface' | 'plain';
};

/** A structural surface. Domain recipes supply their specific color and spacing. */
export function Card({as: Tag='div', variant='surface', className='', ...props}: CardProps) {
  return <Tag {...props} className={`${variant==='surface'?'ui-card':''} ${className}`.trim()}/>;
}
