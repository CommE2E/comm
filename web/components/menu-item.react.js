// @flow

import type { IconDefinition } from '@fortawesome/fontawesome-common-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import classNames from 'classnames';
import * as React from 'react';

import css from './menu.css';

type MenuItemProps = {
  +onClick?: () => mixed,
  +icon: IconDefinition,
  +text: string,
  +dangerous?: boolean,
};

function MenuItem(props: MenuItemProps): React.Node {
  const { onClick, icon, text, dangerous } = props;

  const itemClasses = classNames(css.menuAction, {
    [css.menuActionDangerous]: dangerous,
  });
  return (
    <button className={itemClasses} onClick={onClick}>
      <div className={css.menuActionIcon}>
        <FontAwesomeIcon icon={icon} className={css.promptIcon} />
      </div>
      <div>{text}</div>
    </button>
  );
}

const MemoizedMenuItem: React.ComponentType<MenuItemProps> = React.memo(
  MenuItem,
);

export default MemoizedMenuItem;
