// @flow

import classNames from 'classnames';
import * as React from 'react';

import { useSelector } from '../redux/redux-utils';
import type { NavigationTab } from '../types/nav-types';
import css from './left-layout-aside.css';

type NavigationPanelItemProps = {
  +tab: NavigationTab,
  +children: React.Node,
};

function NavigationPanelItem(props: NavigationPanelItemProps): React.Node {
  const { children } = props;
  return children;
}

type NavigationPanelContainerProps = {
  +children: React.ChildrenArray<?React.Element<typeof NavigationPanelItem>>,
};

function NavigationPanelContainer(
  props: NavigationPanelContainerProps,
): React.Node {
  const { children } = props;
  const navInfo = useSelector(state => state.navInfo);

  const items = React.useMemo(
    () =>
      React.Children.map(children, child => {
        if (!child) {
          return null;
        }
        return (
          <li
            key={child.props.tab}
            className={classNames({
              [css['current-tab']]: navInfo.tab === child.props.tab,
            })}
          >
            {child}
          </li>
        );
      }),
    [children, navInfo.tab],
  );

  return (
    <div className={css.navigationPanelContainer}>
      <ul>{items}</ul>
    </div>
  );
}

const NavigationPanel = {
  Item: NavigationPanelItem,
  Container: NavigationPanelContainer,
};

export default NavigationPanel;
