// @flow

import classnames from 'classnames';
import * as React from 'react';

import css from './button.css';

type Props = {
  +onClick: (event: SyntheticEvent<*>) => void,
  +children: React.Node,
  +variant?: 'primary' | 'secondary' | 'danger' | 'round',
  +type?: string,
  +disabled?: boolean,
  +className?: string,
};

function Button(props: Props): React.Node {
  const {
    onClick,
    children,
    variant,
    type,
    disabled: disabledProp,
    className = '',
  } = props;
  const btnCls = classnames(css.btn, {
    [css.round]: variant === 'round',
    [css.primary]: variant === 'primary',
    [css.secondary]: variant === 'secondary',
    [css.danger]: variant === 'danger',
  });

  let disabled = false;
  if (disabledProp) {
    disabled = disabledProp;
  }

  return (
    <button
      type={type}
      className={`${btnCls} ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

export default Button;
