// @flow

import classNames from 'classnames';
import * as React from 'react';

import type { AppState } from '../redux/redux-setup.js';
import { useSelector } from '../redux/redux-utils';
import css from './topbar.css';

type NavigationPanelItemProps = {
  +tab: string,
  +children: React.Node,
};

function NavigationPanelItem(props: NavigationPanelItemProps): React.Node {
  const { children } = props;
  return children;
}

type NavigationPanelContainerProps<T> = {
  +tabSelector: AppState => T,
  +children: React.ChildrenArray<?React.Element<typeof NavigationPanelItem>>,
};

function NavigationPanelContainer<T>(
  props: NavigationPanelContainerProps<T>,
): React.Node {
  const { children, tabSelector } = props;
  const currentTab = useSelector(tabSelector);

  const items = React.useMemo(
    () =>
      React.Children.map(children, child => {
        if (!child) {
          return null;
        }
        return (
          <div
            key={child.props.tab}
            className={classNames({
              [css.current_tab]: currentTab === child.props.tab,
            })}
          >
            {child}
          </div>
        );
      }),
    [children, currentTab],
  );

  return <div className={css.navigationPanelContainer}>{items}</div>;
}

const NavigationPanel = {
  Item: NavigationPanelItem,
  Container: NavigationPanelContainer,
};

export default NavigationPanel;
