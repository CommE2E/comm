// @flow

import * as React from 'react';

import AppSwitcher from './app-switcher.react';
import CommunityPicker from './community-picker.react';
import css from './sidebar.css';
type Props = {
  +setModal: (modal: ?React.Node) => void,
};

function SideBar(props: Props): React.Node {
  const { setModal } = props;
  return (
    <aside className={css.container}>
      <CommunityPicker setModal={setModal} />
      <AppSwitcher />
    </aside>
  );
}

export default SideBar;
