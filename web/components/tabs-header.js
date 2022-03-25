// @flow

import classnames from 'classnames';
import * as React from 'react';

import css from './tabs.css';

type Props<T: string> = {
  +children?: React.Node,
  +isActive: boolean,
  +setTab: T => mixed,
  +id: T,
};

function TabsHeader<T: string>(props: Props<T>): React.Node {
  const { children, isActive, setTab, id } = props;
  const headerClasses = classnames(css.tabHeader, {
    [css.backgroundTabHeader]: !isActive,
  });
  const onClickSetTab = React.useCallback(() => setTab(id), [setTab, id]);
  return (
    <div className={headerClasses} onClick={onClickSetTab}>
      {children}
    </div>
  );
}

export default TabsHeader;
