// @flow

import * as React from 'react';

import ColorSelectorButton from './color-selector-button.react';
import css from './color-selector.css';

type ColorSelectorProps = {
  +currentThreadColor: string,
};
function ColorSelector(props: ColorSelectorProps): React.Node {
  const { currentThreadColor } = props;
  const [pendingColorSelection, setPendingColorSelection] = React.useState(
    currentThreadColor,
  );

  return (
    <div className={css.container}>
      <div className={css.row}>
        <ColorSelectorButton
          color="#4B87AA"
          pendingColorSelection={pendingColorSelection}
          setPendingColorSelection={setPendingColorSelection}
        />
        <ColorSelectorButton
          color="#5C9F5F"
          pendingColorSelection={pendingColorSelection}
          setPendingColorSelection={setPendingColorSelection}
        />
        <ColorSelectorButton
          color="#B8753D"
          pendingColorSelection={pendingColorSelection}
          setPendingColorSelection={setPendingColorSelection}
        />
        <ColorSelectorButton
          color="#AA4B4B"
          pendingColorSelection={pendingColorSelection}
          setPendingColorSelection={setPendingColorSelection}
        />
        <ColorSelectorButton
          color="#6D49AB"
          pendingColorSelection={pendingColorSelection}
          setPendingColorSelection={setPendingColorSelection}
        />
      </div>
      <div className={css.row}>
        <ColorSelectorButton
          color="#C85000"
          pendingColorSelection={pendingColorSelection}
          setPendingColorSelection={setPendingColorSelection}
        />
        <ColorSelectorButton
          color="#008F83"
          pendingColorSelection={pendingColorSelection}
          setPendingColorSelection={setPendingColorSelection}
        />
        <ColorSelectorButton
          color="#648CAA"
          pendingColorSelection={pendingColorSelection}
          setPendingColorSelection={setPendingColorSelection}
        />
        <ColorSelectorButton
          color="#57697F"
          pendingColorSelection={pendingColorSelection}
          setPendingColorSelection={setPendingColorSelection}
        />
        <ColorSelectorButton
          color="#575757"
          pendingColorSelection={pendingColorSelection}
          setPendingColorSelection={setPendingColorSelection}
        />
      </div>
    </div>
  );
}

export default ColorSelector;
