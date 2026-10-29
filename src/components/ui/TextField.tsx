import type {ComponentProps} from 'react';

/** Native fields retain labels, refs, validation and all keyboard behavior. */
export function TextInput({className='', ...props}: ComponentProps<'input'>) {
  return <input {...props} className={`min-w-0 text-ink ${className}`.trim()}/>;
}

export function TextArea({className='', ...props}: ComponentProps<'textarea'>) {
  return <textarea {...props} className={`min-w-0 text-ink ${className}`.trim()}/>;
}
