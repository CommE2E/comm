// @flow

import * as React from 'react';

import ColorSelectorButton from './color-selector-button.react';
import css from './color-selector.css';

function ColorSelector(): React.Node {
  return (
    <div className={css.container}>
      <div className={css.row}>
        <ColorSelectorButton color="4B87AA" active={true} />
        <ColorSelectorButton color="5C9F5F" active={false} />
        <ColorSelectorButton color="B8753D" active={false} />
        <ColorSelectorButton color="AA4B4B" active={false} />
        <ColorSelectorButton color="6D49AB" active={false} />
      </div>
      <div className={css.row}>
        <ColorSelectorButton color="C85000" active={false} />
        <ColorSelectorButton color="008F83" active={false} />
        <ColorSelectorButton color="648CAA" active={false} />
        <ColorSelectorButton color="57697F" active={false} />
        <ColorSelectorButton color="575757" active={false} />
      </div>
    </div>
  );
}

export default ColorSelector;
