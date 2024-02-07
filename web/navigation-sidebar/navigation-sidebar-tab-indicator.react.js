// @flow

import classNames from 'classnames';
import * as React from 'react';

import css from './navigation-sidebar-tab-indicator.css';

type Props = {
  +isActive: boolean,
};

function NavigationSidebarTabIndicator(props: Props): React.Node {
  const { isActive } = props;

  const containerClassName = classNames(css.container, {
    [css.activeContainer]: isActive,
  });

  return <div className={containerClassName} />;
}

export default NavigationSidebarTabIndicator;
