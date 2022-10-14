// @flow

import * as React from 'react';

import css from './input.css';

type Props = {
  +type: string,
  +placeholder: string,
  +value: string,
  +onChange: (value: SyntheticEvent<HTMLInputElement>) => mixed,
  +onBlur?: (value: SyntheticEvent<HTMLInputElement>) => mixed,
  +disabled?: boolean,
  +label?: string,
  +id?: string,
};

function Input(props: Props, ref): React.Node {
  const { label: labelProp, disabled = false, id, ...rest } = props;

  let label;
  if (labelProp) {
    label = (
      <label className={css.label} htmlFor={id}>
        {labelProp}
      </label>
    );
  }

  return (
    <>
      {label}
      <input
        className={css.input}
        id={id}
        disabled={disabled}
        {...rest}
        ref={ref}
      />
    </>
  );
}

const ForwardedInput: React.AbstractComponent<
  Props,
  HTMLInputElement,
> = React.forwardRef<Props, HTMLInputElement>(Input);

export default ForwardedInput;
