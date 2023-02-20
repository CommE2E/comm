// @flow

import classNames from 'classnames';
import * as React from 'react';

import SWMansionIcon, {
  type Icon,
} from 'lib/components/SWMansionIcon.react.js';

import Button from './button.react.js';
import css from './menu.css';

type MenuItemProps = {
  +onClick?: () => mixed,
  +icon: Icon,
  +text: string,
  +dangerous?: boolean,
};

function MenuItem(props: MenuItemProps): React.Node {
  const { onClick, icon, text, dangerous } = props;

  const itemClasses = classNames(css.menuAction, {
    [css.menuActionDangerous]: dangerous,
  });

  return (
    <Button className={itemClasses} onClick={onClick}>
      <div className={css.menuActionIcon}>
        <SWMansionIcon size="100%" icon={icon} />
      </div>
      <div>{text}</div>
    </Button>
  );
}

const MemoizedMenuItem: React.ComponentType<MenuItemProps> =
  React.memo(MenuItem);

export default MemoizedMenuItem;
