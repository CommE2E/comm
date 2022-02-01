// @flow

import * as React from 'react';

type Props = {
  +type: string,
  +placeholder: string,
  +value: string,
  +onChange: (value: SyntheticEvent<HTMLInputElement>) => mixed,
  +disabled: boolean,
  +label?: string,
  id?: string,
};

function Input(props: Props, ref): React.Node {
  const { label: labelProps, id, ...rest } = props;
  let label;
  if (labelProps) {
    label = <label htmlFor={id}>{labelProps}</label>;
  }

  return (
    <>
      {label}
      <input id={id} {...rest} ref={ref} />
    </>
  );
}

const ForwardedInput: React.AbstractComponent<
  Props,
  HTMLInputElement,
> = React.forwardRef<Props, HTMLInputElement>(Input);

export default ForwardedInput;
