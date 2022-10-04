// @flow

import classnames from 'classnames';
import * as React from 'react';

import css from './button.css';

export type ButtonVariant = 'filled' | 'outline' | 'round' | 'text';
export type ButtonColor =
  | 'success'
  | 'danger'
  | {
      +backgroundColor: string,
      +color?: string,
    };

export type ButtonProps = {
  +onClick: (event: SyntheticEvent<HTMLButtonElement>) => mixed,
  +children: React.Node,
  +variant?: ButtonVariant,
  +buttonColor?: ButtonColor,
  +type?: string,
  +disabled?: boolean,
  +className?: string,
};

function Button(props: ButtonProps): React.Node {
  const {
    onClick,
    children,
    variant = 'filled',
    buttonColor,
    type,
    disabled = false,
    className = '',
  } = props;

  const btnCls = classnames(
    css.btn,
    css[variant],
    typeof buttonColor === 'string' ? css[buttonColor] : null,
  );

  return (
    <button
      type={type}
      className={`${btnCls} ${className}`}
      onClick={onClick}
      disabled={disabled}
      style={typeof buttonColor !== 'string' ? buttonColor : null}
    >
      {children}
    </button>
  );
}

export default Button;
