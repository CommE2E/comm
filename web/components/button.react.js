// @flow

import classnames from 'classnames';
import * as React from 'react';
import tinycolor from 'tinycolor2';

import css from './button.css';

export type ButtonVariant = 'filled' | 'outline' | 'round';
export type ButtonColor = {
  +backgroundColor: string,
  +color?: string,
  +hoverColor?: string,
  +disabledColor?: string,
};

export const buttonThemes = {
  standard: ({
    backgroundColor: 'var(--btn-bg-filled)',
    hoverColor: 'var(--btn-bg-filled-hover)',
    disabledColor: 'var(--btn-bg-filled-disabled)',
  }: ButtonColor),
  danger: ({
    backgroundColor: 'var(--btn-bg-danger)',
    hoverColor: 'var(--btn-bg-danger-hover)',
    disabledColor: 'var(--btn-bg-danger-disabled)',
  }: ButtonColor),
  success: ({
    backgroundColor: 'var(--btn-bg-success)',
    hoverColor: 'var(--btn-bg-success-hover)',
    disabledColor: 'var(--btn-bg-success-disabled)',
  }: ButtonColor),
  outline: ({
    backgroundColor: 'var(--btn-bg-outline)',
    hoverColor: 'var(--btn-bg-outline-hover)',
    disabledColor: 'var(--btn-bg-outline-disabled)',
  }: ButtonColor),
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

  const btnCls = classnames(css.btn, css[variant]);

  const style = React.useMemo(() => {
    let color;
    if (buttonColor) {
      color = buttonColor;
    } else if (variant === 'outline') {
      color = buttonThemes.outline;
    } else {
      color = buttonThemes.standard;
    }

    let hoverColor;
    if (color.hoverColor) {
      hoverColor = color.hoverColor;
    } else {
      const col = tinycolor(color.backgroundColor);
      if (col.isValid()) {
        hoverColor = col.darken();
      } else {
        hoverColor = color.backgroundColor;
      }
    }

    return {
      'color': color.color,
      '--background-color': color.backgroundColor,
      '--hover-background-color': hoverColor,
      '--disabled-background-color':
        color.disabledColor ?? color.backgroundColor,
    };
  }, [buttonColor, variant]);

  return (
    <button
      type={type}
      className={`${btnCls} ${className}`}
      onClick={onClick}
      disabled={disabled}
      style={style}
    >
      {children}
    </button>
  );
}

export default Button;
