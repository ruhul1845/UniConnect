export function Button({ children, variant = 'primary', className = '', ...props }) {
  const variants = {
    primary: 'bg-uniGold text-uniBlue hover:bg-yellow-400',
    navy: 'bg-uniBlue text-white hover:bg-blue-950',
    outline: 'bg-white text-uniBlue border border-blue-100 hover:bg-blue-50',
    danger: 'bg-red-600 text-white hover:bg-red-700',
    ghost: 'bg-transparent text-uniBlue hover:bg-blue-50',
  };
  return <button className={`inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-extrabold transition disabled:cursor-not-allowed disabled:opacity-60 ${variants[variant]} ${className}`} {...props}>{children}</button>;
}

export function LinkButton({ children, variant = 'primary', className = '', ...props }) {
  const variants = {
    primary: 'bg-uniGold text-uniBlue hover:bg-yellow-400',
    navy: 'bg-uniBlue text-white hover:bg-blue-950',
    outline: 'bg-white text-uniBlue border border-blue-100 hover:bg-blue-50',
    danger: 'bg-red-600 text-white hover:bg-red-700',
  };
  return <a className={`inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-extrabold transition ${variants[variant]} ${className}`} {...props}>{children}</a>;
}
