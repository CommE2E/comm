// @flow

import classNames from 'classnames';
import * as React from 'react';

import SWMansionIcon, {
  type Icon,
} from 'lib/components/SWMansionIcon.react.js';

import Button from './button.react.js';
import css from './menu.css';

type MenuItemPropsBase = {
  +onClick?: () => mixed,
  +text: string,
  +dangerous?: boolean,
};
type MenuItemProps =
  | {
      ...MenuItemPropsBase,
      +icon: Icon,
    }
  | {
      ...MenuItemPropsBase,
      +iconComponent: React.Node,
    };

function MenuItem(props: MenuItemProps): React.Node {
  const { onClick, icon, iconComponent, text, dangerous } = props;

  const itemClasses = classNames(css.menuAction, {
    [css.menuActionDangerous]: dangerous,
  });

  let menuItemIcon = iconComponent;
  if (icon) {
    menuItemIcon = <SWMansionIcon size="100%" icon={icon} />;
  }

  return (
    <Button className={itemClasses} onClick={onClick}>
      <div className={css.menuActionIcon}>{menuItemIcon}</div>
      <div>{text}</div>
    </Button>
  );
}

const MemoizedMenuItem: React.ComponentType<MenuItemProps> =
  React.memo(MenuItem);

export default MemoizedMenuItem;
