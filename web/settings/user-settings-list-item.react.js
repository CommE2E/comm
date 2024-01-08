// @flow

import classNames from 'classnames';
import * as React from 'react';

import css from './user-settings-list-item.css';
import { useSelector } from '../redux/redux-utils.js';
import { navSettingsSectionSelector } from '../selectors/nav-selectors.js';
import type { NavigationSettingsSection } from '../types/nav-types.js';

type Props = {
  +id: NavigationSettingsSection,
  +name: string,
  +onClick: () => mixed,
};

function UserSettingsListItem(props: Props): React.Node {
  const { id, name, onClick } = props;

  const currentSelectedSettings = useSelector(navSettingsSectionSelector);

  const className = classNames(css.container, {
    [css.selected]: currentSelectedSettings === id,
  });

  return (
    <div className={className} onClick={onClick}>
      {name}
    </div>
  );
}

export default UserSettingsListItem;
