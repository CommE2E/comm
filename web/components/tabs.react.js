// @flow

import classNames from 'classnames';
import * as React from 'react';

import TabsHeader, { type TabsHeaderStyle } from './tabs-header.js';
import css from './tabs.css';

export type TabData<T: string> = {
  +id: T,
  +header: React.Node,
};

type Props<T: string> = {
  +tabItems: $ReadOnlyArray<TabData<T>>,
  +activeTab: T,
  +setTab: T => mixed,
  +headerStyle?: TabsHeaderStyle,
};

function Tabs<T: string>(props: Props<T>): React.Node {
  const { tabItems, activeTab, setTab, headerStyle = 'underline' } = props;

  const items = React.useMemo(
    () =>
      tabItems.map((item, index) => (
        <TabsHeader
          key={index}
          id={item.id}
          isActive={item.id === activeTab}
          setTab={setTab}
          headerStyle={headerStyle}
        >
          {item.header}
        </TabsHeader>
      )),
    [activeTab, headerStyle, setTab, tabItems],
  );

  const className = classNames(css.container, {
    [css.containerPill]: headerStyle === 'pill',
  });

  const tabs = React.useMemo(
    () => <div className={className}>{items}</div>,
    [className, items],
  );

  return tabs;
}

export default Tabs;
