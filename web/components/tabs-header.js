// @flow

import classnames from 'classnames';
import * as React from 'react';

import Button from './button.react.js';
import cssPill from './tabs-pill.css';
import cssUnderline from './tabs-underline.css';

type Props<T: string> = {
  +children: React.Node,
  +isActive: boolean,
  +setTab: T => mixed,
  +id: T,
  +isPillStyle?: boolean,
};

function TabsHeader<T: string>(props: Props<T>): React.Node {
  const { children, isActive, setTab, id, isPillStyle = false } = props;
  const css = React.useMemo(() => (isPillStyle ? cssPill : cssUnderline), [
    isPillStyle,
  ]);
  const headerClasses = classnames(css.tabHeader, {
    [css.backgroundTabHeader]: !isActive,
  });
  const onClickSetTab = React.useCallback(() => setTab(id), [setTab, id]);
  return (
    <Button className={headerClasses} onClick={onClickSetTab}>
      {children}
    </Button>
  );
}

export default TabsHeader;
