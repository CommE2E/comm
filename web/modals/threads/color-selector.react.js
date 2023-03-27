// @flow

import * as React from 'react';

import { selectedThreadColors } from 'lib/shared/color-utils.js';

import ColorSelectorButton from './color-selector-button.react.js';
import css from './color-selector.css';

type ColorSelectorProps = {
  +currentColor: string,
  +onColorSelection: (hex: string) => void,
};
function ColorSelector(props: ColorSelectorProps): React.Node {
  const { currentColor, onColorSelection } = props;

  const colorSelectorButtons = React.useMemo(
    () =>
      selectedThreadColors.map(color => (
        <ColorSelectorButton
          key={color}
          color={color}
          currentColor={currentColor}
          onColorSelection={onColorSelection}
        />
      )),
    [currentColor, onColorSelection],
  );

  return <div className={css.container}>{colorSelectorButtons}</div>;
}

export default ColorSelector;
