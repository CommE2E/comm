// @flow

import classNames from 'classnames';
import * as React from 'react';

import SWMansionIcon, {
  type Icon,
} from 'lib/components/SWMansionIcon.react.js';

import css from './app-list-item.css';
import { useSelector } from '../redux/redux-utils.js';
import { navTabSelector } from '../selectors/nav-selectors.js';
import type { NavigationTab } from '../types/nav-types.js';

type Props = {
  +id: NavigationTab,
  +name: string,
  +icon: Icon,
  +onClick: () => mixed,
};

function AppListItem(props: Props): React.Node {
  const { id, name, icon, onClick } = props;

  const currentSelectedApp = useSelector(navTabSelector);

  const className = classNames(css.container, {
    [css.selected]: currentSelectedApp === id,
  });

  return (
    <div className={className} onClick={onClick}>
      <SWMansionIcon icon={icon} size={18} />
      <div>{name}</div>
    </div>
  );
}

export default AppListItem;
