// @flow

import * as React from 'react';

import { selectedThreadColors } from 'lib/shared/thread-utils';

import ColorSelectorButton from './color-selector-button.react';
import css from './color-selector.css';

type ColorSelectorProps = {
  +currentColor: string,
  +onColorSelection: (hex: string) => void,
};
function ColorSelector(props: ColorSelectorProps): React.Node {
  const { currentColor, onColorSelection } = props;

  return (
    <div className={css.container}>
      <div className={css.row}>
        <ColorSelectorButton
          color={selectedThreadColors[0]}
          currentColor={currentColor}
          onColorSelection={onColorSelection}
        />
        <ColorSelectorButton
          color={selectedThreadColors[1]}
          currentColor={currentColor}
          onColorSelection={onColorSelection}
        />
        <ColorSelectorButton
          color={selectedThreadColors[2]}
          currentColor={currentColor}
          onColorSelection={onColorSelection}
        />
        <ColorSelectorButton
          color={selectedThreadColors[3]}
          currentColor={currentColor}
          onColorSelection={onColorSelection}
        />
        <ColorSelectorButton
          color={selectedThreadColors[4]}
          currentColor={currentColor}
          onColorSelection={onColorSelection}
        />
      </div>
      <div className={css.row}>
        <ColorSelectorButton
          color={selectedThreadColors[5]}
          currentColor={currentColor}
          onColorSelection={onColorSelection}
        />
        <ColorSelectorButton
          color={selectedThreadColors[6]}
          currentColor={currentColor}
          onColorSelection={onColorSelection}
        />
        <ColorSelectorButton
          color={selectedThreadColors[7]}
          currentColor={currentColor}
          onColorSelection={onColorSelection}
        />
        <ColorSelectorButton
          color={selectedThreadColors[8]}
          currentColor={currentColor}
          onColorSelection={onColorSelection}
        />
        <ColorSelectorButton
          color={selectedThreadColors[9]}
          currentColor={currentColor}
          onColorSelection={onColorSelection}
        />
      </div>
    </div>
  );
}

export default ColorSelector;
