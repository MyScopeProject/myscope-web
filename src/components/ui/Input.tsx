/**
 * Input Components
 * 
 * @description Styled form inputs with focus and error states
 * @usage
 * <Input type="text" label="Email" placeholder="Enter email" />
 * <TextArea label="Message" rows={4} error="This field is required" />
 * <Select label="Genre" options={[...]} />
 */

import { InputHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes, ReactNode } from 'react';

// Base Input Props
interface BaseInputProps {
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
}

// Text Input
interface InputProps extends InputHTMLAttributes<HTMLInputElement>, BaseInputProps {}

export function Input({
  label,
  error,
  helperText,
  required,
  className = '',
  ...props
}: InputProps) {
  const baseStyles = 'w-full px-4 py-3 bg-gray-800 border rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900';
  const errorStyles = error
    ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
    : 'border-gray-700 focus:border-emerald-500 focus:ring-emerald-500';
  const textStyles = 'text-gray-100 placeholder:text-gray-500';

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-300 mb-2">
          {label}
          {required && <span className="text-red-400 ml-1">*</span>}
        </label>
      )}
      <input
        className={`${baseStyles} ${errorStyles} ${textStyles} ${className}`}
        {...props}
      />
      {error && (
        <p className="mt-1 text-sm text-red-400">{error}</p>
      )}
      {helperText && !error && (
        <p className="mt-1 text-sm text-gray-500">{helperText}</p>
      )}
    </div>
  );
}

// TextArea
interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement>, BaseInputProps {}

export function TextArea({
  label,
  error,
  helperText,
  required,
  className = '',
  ...props
}: TextAreaProps) {
  const baseStyles = 'w-full px-4 py-3 bg-gray-800 border rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 resize-none';
  const errorStyles = error
    ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
    : 'border-gray-700 focus:border-emerald-500 focus:ring-emerald-500';
  const textStyles = 'text-gray-100 placeholder:text-gray-500';

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-300 mb-2">
          {label}
          {required && <span className="text-red-400 ml-1">*</span>}
        </label>
      )}
      <textarea
        className={`${baseStyles} ${errorStyles} ${textStyles} ${className}`}
        {...props}
      />
      {error && (
        <p className="mt-1 text-sm text-red-400">{error}</p>
      )}
      {helperText && !error && (
        <p className="mt-1 text-sm text-gray-500">{helperText}</p>
      )}
    </div>
  );
}

// Select
interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement>, BaseInputProps {
  options: { value: string; label: string }[];
}

export function Select({
  label,
  error,
  helperText,
  required,
  options,
  className = '',
  ...props
}: SelectProps) {
  const baseStyles = 'w-full px-4 py-3 bg-gray-800 border rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900';
  const errorStyles = error
    ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
    : 'border-gray-700 focus:border-emerald-500 focus:ring-emerald-500';
  const textStyles = 'text-gray-100';

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-300 mb-2">
          {label}
          {required && <span className="text-red-400 ml-1">*</span>}
        </label>
      )}
      <select
        className={`${baseStyles} ${errorStyles} ${textStyles} ${className}`}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <p className="mt-1 text-sm text-red-400">{error}</p>
      )}
      {helperText && !error && (
        <p className="mt-1 text-sm text-gray-500">{helperText}</p>
      )}
    </div>
  );
}
