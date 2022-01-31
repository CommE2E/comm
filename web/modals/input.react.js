// @flow

import * as React from 'react';

type Props = {
  +type: string,
  +placeholder: string,
  +value: string,
  +onChange: (value: SyntheticEvent<HTMLInputElement>) => mixed,
  +disabled: boolean,
  +label?: string,
  +id?: string,
};

import css from './input.css';

function Input(props: Props, ref): React.Node {
  const { label: labelProps, id, ...rest } = props;
  let label;
  if (labelProps) {
    label = (
      <label className={css.label} htmlFor={id}>
        {labelProps}
      </label>
    );
  }

  return (
    <>
      {label}
      <input className={css.input} id={id} {...rest} ref={ref} />
    </>
  );
}

const ForwardedInput: React.AbstractComponent<
  Props,
  HTMLInputElement,
> = React.forwardRef<Props, HTMLInputElement>(Input);

export default ForwardedInput;
