// @flow

import classNames from 'classnames';
import * as React from 'react';

import verticalCSS from './settings-switcher.css';
import horizontalCSS from './topbar.css';
import type { AppState } from '../redux/redux-setup.js';
import { useSelector } from '../redux/redux-utils.js';

type NavigationPanelContextType = {
  +currentTab: ?string,
  +css: { [key: string]: string },
};

const NavigationPanelContext = React.createContext<NavigationPanelContextType>({
  currentTab: null,
  css: {},
});

type NavigationPanelItemProps = {
  +tab: string,
  +children: React.Node,
};

function NavigationPanelItem(props: NavigationPanelItemProps): React.Node {
  const { children, tab } = props;
  const { currentTab, css } = React.useContext(NavigationPanelContext);
  return (
    <div
      className={classNames({
        [css.current_tab]: currentTab === tab,
      })}
    >
      {children}
    </div>
  );
}

type NavigationPanelContainerProps<T: ?string> = {
  +tabSelector: AppState => T,
  +children: React.ChildrenArray<?React.MixedElement>,
  +horizontal?: boolean,
};

function NavigationPanelContainer<T: ?string>(
  props: NavigationPanelContainerProps<T>,
): React.Node {
  const { children, tabSelector, horizontal = false } = props;
  const currentTab = useSelector(tabSelector);
  const css = horizontal ? horizontalCSS : verticalCSS;

  return (
    <NavigationPanelContext.Provider value={{ currentTab, css }}>
      <div className={css.navigationPanelContainer}>{children}</div>
    </NavigationPanelContext.Provider>
  );
}

const NavigationPanel = {
  Item: NavigationPanelItem,
  Container: NavigationPanelContainer,
};

export default NavigationPanel;
