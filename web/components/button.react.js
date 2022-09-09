// @flow

import classnames from 'classnames';
import * as React from 'react';

import css from './button.css';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'success'
  | 'danger'
  | 'round';

type Props = {
  +onClick: (event: SyntheticEvent<HTMLButtonElement>) => mixed,
  +children: React.Node,
  +variant?: ButtonVariant,
  +type?: string,
  +disabled?: boolean,
  +className?: string,
};

function Button(props: Props): React.Node {
  const {
    onClick,
    children,
    variant = 'primary',
    type,
    disabled = false,
    className = '',
  } = props;
  const btnCls = classnames(css.btn, css[variant]);

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
