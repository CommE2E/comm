// @flow

import classNames from 'classnames';
import * as React from 'react';

import { selectedThreadColors } from 'lib/shared/color-utils.js';

import ColorSelectorButton from './color-selector-button.react.js';
import css from './color-selector.css';

type ColorSelectorProps = {
  +currentColor: string,
  +onColorSelection: (hex: string) => void,
  +size?: 'small' | 'large',
};
function ColorSelector(props: ColorSelectorProps): React.Node {
  const { currentColor, onColorSelection, size } = props;

  const colorSelectorButtons = React.useMemo(
    () =>
      selectedThreadColors.map(color => (
        <ColorSelectorButton
          key={color}
          color={color}
          currentColor={currentColor}
          onColorSelection={onColorSelection}
          size={size}
        />
      )),
    [currentColor, onColorSelection, size],
  );

  const containerClassName = classNames({
    [css.container]: true,
    [css.containerLarge]: size === 'large',
  });

  return <div className={containerClassName}>{colorSelectorButtons}</div>;
}

export default ColorSelector;
