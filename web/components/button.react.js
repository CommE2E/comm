// @flow

import classnames from 'classnames';
import * as React from 'react';

import css from './button.css';

type Props = {
  +onClick: (event: SyntheticEvent<*>) => void,
  +children: React.Node,
  +variant?: 'primary' | 'secondary' | 'round',
  +type?: string,
  +disabled?: boolean,
};

function Button(props: Props): React.Node {
  const { onClick, children, variant, type, disabled: disabledProp } = props;
  const btnCls = classnames(css.btn, {
    [css.round]: variant === 'round',
    [css.primary]: variant === 'primary',
    [css.secondary]: variant === 'secondary',
  });

  let disabled = false;
  if (disabledProp) {
    disabled = disabledProp;
  }

  return (
    <button
      type={type}
      className={btnCls}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

export default Button;
