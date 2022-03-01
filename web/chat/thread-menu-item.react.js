// @flow

import type { IconDefinition } from '@fortawesome/fontawesome-common-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import classNames from 'classnames';
import * as React from 'react';

import css from './thread-menu.css';

type ThreadMenuItemProps = {
  +onClick?: () => mixed,
  +icon: IconDefinition,
  +text: string,
  +dangerous?: boolean,
};

function ThreadMenuItem(props: ThreadMenuItemProps): React.Node {
  const { onClick, icon, text, dangerous } = props;

  const itemClasses = classNames(css.topBarMenuAction, {
    [css.topBarMenuActionDangerous]: dangerous,
  });
  return (
    <button className={itemClasses} onClick={onClick}>
      <div className={css.topBarMenuActionIcon}>
        <FontAwesomeIcon icon={icon} className={css.promptIcon} />
      </div>
      <div>{text}</div>
    </button>
  );
}

const MemoizedThreadMenuItem: React.ComponentType<ThreadMenuItemProps> = React.memo(
  ThreadMenuItem,
);

export default MemoizedThreadMenuItem;
