// @flow

import classNames from 'classnames';
import * as React from 'react';

import { type SelectedThreadColors } from 'lib/shared/thread-utils.js';

import css from './color-selector-button.css';

type ColorSelectorButtonProps = {
  +color: SelectedThreadColors,
  +active: boolean,
};
function ColorSelectorButton(props: ColorSelectorButtonProps): React.Node {
  const { color, active } = props;

  const containerClassName = classNames(css.container, {
    [css.active]: active,
  });

  const colorSplotchStyle = React.useMemo(
    () => ({
      backgroundColor: `#${color}`,
    }),
    [color],
  );

  return (
    <div className={containerClassName}>
      <div className={css.colorSplotch} style={colorSplotchStyle} />
    </div>
  );
}

export default ColorSelectorButton;
