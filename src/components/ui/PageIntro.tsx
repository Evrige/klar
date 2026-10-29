import type {ComponentProps} from 'react';

export function PageIntro({className='', ...props}: ComponentProps<'div'>) {
  return <div {...props} className={`page-intro ${className}`.trim()}/>;
}
