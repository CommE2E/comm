// @flow

import * as React from 'react';

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
          color="4B87AA"
          currentColor={currentColor}
          onColorSelection={onColorSelection}
        />
        <ColorSelectorButton
          color="5C9F5F"
          currentColor={currentColor}
          onColorSelection={onColorSelection}
        />
        <ColorSelectorButton
          color="B8753D"
          currentColor={currentColor}
          onColorSelection={onColorSelection}
        />
        <ColorSelectorButton
          color="AA4B4B"
          currentColor={currentColor}
          onColorSelection={onColorSelection}
        />
        <ColorSelectorButton
          color="6D49AB"
          currentColor={currentColor}
          onColorSelection={onColorSelection}
        />
      </div>
      <div className={css.row}>
        <ColorSelectorButton
          color="C85000"
          currentColor={currentColor}
          onColorSelection={onColorSelection}
        />
        <ColorSelectorButton
          color="008F83"
          currentColor={currentColor}
          onColorSelection={onColorSelection}
        />
        <ColorSelectorButton
          color="648CAA"
          currentColor={currentColor}
          onColorSelection={onColorSelection}
        />
        <ColorSelectorButton
          color="57697F"
          currentColor={currentColor}
          onColorSelection={onColorSelection}
        />
        <ColorSelectorButton
          color="575757"
          currentColor={currentColor}
          onColorSelection={onColorSelection}
        />
      </div>
    </div>
  );
}

export default ColorSelector;
