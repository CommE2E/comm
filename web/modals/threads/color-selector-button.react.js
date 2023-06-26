// @flow

import classNames from 'classnames';
import * as React from 'react';
import tinycolor from 'tinycolor2';

import css from './color-selector-button.css';
import Button from '../../components/button.react.js';

type ColorSelectorButtonProps = {
  +color: string,
  +currentColor: string,
  +onColorSelection: (hex: string) => void,
  +size?: 'small' | 'large',
};
function ColorSelectorButton(props: ColorSelectorButtonProps): React.Node {
  const { color, currentColor, onColorSelection, size } = props;

  const active = tinycolor.equals(color, currentColor);
  const containerClassName = classNames({
    [css.container]: true,
    [css.containerLarge]: size === 'large',
    [css.active]: active,
  });

  const colorSplotchClassName = classNames({
    [css.colorSplotch]: true,
    [css.colorSplotchLarge]: size === 'large',
  });

  const colorSplotchStyle = React.useMemo(
    () => ({
      backgroundColor: `#${color}`,
    }),
    [color],
  );

  const onColorSplotchClicked = React.useCallback(() => {
    onColorSelection(color);
  }, [onColorSelection, color]);

  return (
    <Button onClick={onColorSplotchClicked} className={containerClassName}>
      <div className={colorSplotchClassName} style={colorSplotchStyle} />
    </Button>
  );
}

export default ColorSelectorButton;
