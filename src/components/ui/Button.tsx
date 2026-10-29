import type {ComponentProps} from 'react';

const variants = {
  primary: 'primary',
  secondary: 'secondary',
  text: 'text-button',
  icon: 'icon-button',
  speech: 'speech-action',
  light: 'light-button',
} as const;

export type ButtonProps = ComponentProps<'button'> & {
  variant?: keyof typeof variants;
};

/** Keep native button semantics: a button inside a form still submits by default. */
export function Button({variant='primary', className='', ...props}: ButtonProps) {
  return <button {...props} className={`${variants[variant]} ${className}`.trim()}/>;
}
