// @flow

import * as React from 'react';

import TabsHeader from './tabs-header.js';
import css from './tabs.css';

type TabsContainerProps<T: string> = {
  +children?: React.ChildrenArray<?React.Element<typeof TabsItem>>,
  +activeTab: T,
  +setTab: T => mixed,
};

function TabsContainer<T: string>(props: TabsContainerProps<T>): React.Node {
  const { children, activeTab, setTab } = props;

  const headers = React.Children.map(children, tab => {
    const { id, header } = tab.props;

    const isActive = id === activeTab;
    return (
      <TabsHeader id={id} isActive={isActive} setTab={setTab}>
        {header}
      </TabsHeader>
    );
  });

  const currentTab = React.Children.toArray(children).find(
    tab => tab.props.id === activeTab,
  );

  const currentContent = currentTab ? currentTab.props.children : null;

  return (
    <div className={css.tabsContainer}>
      <div className={css.tabsHeaderContainer}>
        <div className={css.tabsHeaderContainerPill}>{headers}</div>
      </div>
      {currentContent}
    </div>
  );
}

type TabsItemProps<T: string> = {
  +children: React.Node,
  +id: T,
  +header: React.Node,
};

function TabsItem<T: string>(props: TabsItemProps<T>): React.Node {
  const { children } = props;
  return children;
}

const Tabs = {
  Container: TabsContainer,
  Item: TabsItem,
};

export default Tabs;
