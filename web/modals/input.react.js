// @flow

import classNames from 'classnames';
import * as React from 'react';

import css from './input.css';

export type BaseInputProps = {
  +value: string,
  +onChange: (value: SyntheticEvent<HTMLInputElement>) => mixed,
  +onBlur?: (value: SyntheticEvent<HTMLInputElement>) => mixed,
  +disabled?: boolean,
  +label?: string,
  +id?: string,
  +className?: string,
};

export type InputProps = {
  ...BaseInputProps,
  +type: string,
  +placeholder: string,
  +maxLength?: number,
};

function Input(props: InputProps, ref): React.Node {
  const {
    label: labelProp,
    disabled = false,
    className = '',
    id,
    ...rest
  } = props;

  let label;
  if (labelProp) {
    label = (
      <label className={css.label} htmlFor={id}>
        {labelProp}
      </label>
    );
  }

  const inputClassName = classNames(css.input, className);

  return (
    <>
      {label}
      <input
        className={inputClassName}
        id={id}
        disabled={disabled}
        {...rest}
        ref={ref}
      />
    </>
  );
}

const ForwardedInput: React.AbstractComponent<
  InputProps,
  HTMLInputElement,
> = React.forwardRef<InputProps, HTMLInputElement>(Input);

export default ForwardedInput;
