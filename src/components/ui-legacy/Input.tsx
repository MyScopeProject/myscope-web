'use client';

/**
 * Input Components (Premium Design System)
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
  const baseStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px 16px',
    backgroundColor: '#1E1A2B',
    border: `1px solid ${error ? '#ef4444' : 'rgba(196, 181, 253, 0.12)'}`,
    borderRadius: '12px',
    fontSize: '14px',
    color: '#F5F3FA',
    transition: 'all 200ms ease',
    fontFamily: '"Inter", sans-serif',
  };

  return (
    <div style={{ width: '100%' }}>
      {label && (
        <label style={{
          display: 'block',
          fontSize: '14px',
          fontWeight: '500',
          fontFamily: '"Inter", sans-serif',
          color: '#F5F3FA',
          marginBottom: '12px',
        }}>
          {label}
          {required && <span style={{ color: '#ef4444', marginLeft: '4px' }}>*</span>}
        </label>
      )}
      <input
        style={baseStyle}
        className={className}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = 'rgba(196, 181, 253, 0.28)';
          e.currentTarget.style.boxShadow = '0 0 0 3px rgba(167, 139, 250, 0.12)';
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = error ? '#ef4444' : 'rgba(196, 181, 253, 0.12)';
          e.currentTarget.style.boxShadow = 'none';
        }}
        {...props}
      />
      {error && (
        <p style={{ marginTop: '8px', fontSize: '12px', color: '#ef4444', fontWeight: '500' }}>
          {error}
        </p>
      )}
      {helperText && !error && (
        <p style={{ marginTop: '8px', fontSize: '12px', color: '#9B95B5' }}>
          {helperText}
        </p>
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
  const baseStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px 16px',
    backgroundColor: '#1E1A2B',
    border: `1px solid ${error ? '#ef4444' : 'rgba(196, 181, 253, 0.12)'}`,
    borderRadius: '12px',
    fontSize: '14px',
    color: '#F5F3FA',
    transition: 'all 200ms ease',
    fontFamily: '"Inter", sans-serif',
    resize: 'none',
  };

  return (
    <div style={{ width: '100%' }}>
      {label && (
        <label style={{
          display: 'block',
          fontSize: '14px',
          fontWeight: '500',
          fontFamily: '"Inter", sans-serif',
          color: '#F5F3FA',
          marginBottom: '12px',
        }}>
          {label}
          {required && <span style={{ color: '#ef4444', marginLeft: '4px' }}>*</span>}
        </label>
      )}
      <textarea
        style={baseStyle}
        className={className}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = 'rgba(196, 181, 253, 0.28)';
          e.currentTarget.style.boxShadow = '0 0 0 3px rgba(167, 139, 250, 0.12)';
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = error ? '#ef4444' : 'rgba(196, 181, 253, 0.12)';
          e.currentTarget.style.boxShadow = 'none';
        }}
        {...props}
      />
      {error && (
        <p style={{ marginTop: '8px', fontSize: '12px', color: '#ef4444', fontWeight: '500' }}>
          {error}
        </p>
      )}
      {helperText && !error && (
        <p style={{ marginTop: '8px', fontSize: '12px', color: '#9B95B5' }}>
          {helperText}
        </p>
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
  const baseStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px 16px',
    backgroundColor: '#1E1A2B',
    border: `1px solid ${error ? '#ef4444' : 'rgba(196, 181, 253, 0.12)'}`,
    borderRadius: '12px',
    fontSize: '14px',
    color: '#F5F3FA',
    transition: 'all 200ms ease',
    fontFamily: '"Inter", sans-serif',
  };

  return (
    <div style={{ width: '100%' }}>
      {label && (
        <label style={{
          display: 'block',
          fontSize: '14px',
          fontWeight: '500',
          fontFamily: '"Inter", sans-serif',
          color: '#F5F3FA',
          marginBottom: '12px',
        }}>
          {label}
          {required && <span style={{ color: '#ef4444', marginLeft: '4px' }}>*</span>}
        </label>
      )}
      <select
        style={baseStyle}
        className={className}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = 'rgba(196, 181, 253, 0.28)';
          e.currentTarget.style.boxShadow = '0 0 0 3px rgba(167, 139, 250, 0.12)';
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = error ? '#ef4444' : 'rgba(196, 181, 253, 0.12)';
          e.currentTarget.style.boxShadow = 'none';
        }}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <p style={{ marginTop: '8px', fontSize: '12px', color: '#ef4444', fontWeight: '500' }}>
          {error}
        </p>
      )}
      {helperText && !error && (
        <p style={{ marginTop: '8px', fontSize: '12px', color: '#9B95B5' }}>
          {helperText}
        </p>
      )}
    </div>
  );
}
