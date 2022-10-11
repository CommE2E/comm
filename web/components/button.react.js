// @flow

import classnames from 'classnames';
import * as React from 'react';

import css from './button.css';

export type ButtonVariant = 'plain' | 'filled' | 'outline' | 'text';
export type ButtonColor = {
  +backgroundColor?: string,
  +color?: string,
};

export const buttonThemes: { [string]: ButtonColor } = {
  standard: {
    backgroundColor: 'var(--btn-bg-filled)',
  },
  danger: {
    backgroundColor: 'var(--btn-bg-danger)',
  },
  success: {
    backgroundColor: 'var(--btn-bg-success)',
  },
  outline: {
    backgroundColor: 'var(--btn-bg-outline)',
  },
};

export type ButtonProps = {
  +onClick: ?(event: SyntheticEvent<HTMLButtonElement>) => mixed,
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
    variant = 'plain',
    buttonColor,
    type = 'button',
    disabled = false,
    className = '',
  } = props;

  const btnCls = classnames({
    [css.plain]: true,
    [css.btn]: variant === 'filled' || variant === 'outline',
    [css[variant]]: true,
  });

  let style = {};
  if (buttonColor) {
    style = buttonColor;
  } else if (variant === 'outline') {
    style = buttonThemes.outline;
  } else if (variant === 'filled') {
    style = buttonThemes.standard;
  }

  const wrappedChildren = React.Children.map(children, child => {
    if (typeof child === 'string' || typeof child === 'number') {
      return <span>{child}</span>;
    }
    return child;
  });

  return (
    <button
      type={type}
      className={`${btnCls} ${className}`}
      onClick={onClick}
      disabled={disabled}
      style={style}
    >
      {wrappedChildren}
    </button>
  );
}

export default Button;
