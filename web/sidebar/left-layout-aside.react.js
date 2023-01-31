// @flow

import * as React from 'react';

import { useSelector } from '../redux/redux-utils';
import AppSwitcher from '../topbar/app-switcher.react';
import CommunityPicker from './community-picker.react';
import css from './left-layout-aside.css';
import SettingsSwitcher from './settings-switcher.react';

function LeftLayoutAside(): React.Node {
  const navInfo = useSelector(state => state.navInfo);
  const navigationPanel = React.useMemo(() => {
    if (navInfo.tab === 'settings') {
      return <SettingsSwitcher />;
    }
    return <AppSwitcher />;
  }, [navInfo.tab]);
  return (
    <aside className={css.container}>
      <CommunityPicker />
      {navigationPanel}
    </aside>
  );
}

const MemoizedLeftLayoutAside: React.ComponentType<{}> = React.memo<{}>(
  LeftLayoutAside,
);

export default MemoizedLeftLayoutAside;
