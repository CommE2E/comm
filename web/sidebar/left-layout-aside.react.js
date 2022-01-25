// @flow

import * as React from 'react';

import AppSwitcher from './app-switcher.react';
import CommunityPicker from './community-picker.react';
import css from './left-layout-aside.css';
type Props = {
  +setModal: (modal: ?React.Node) => void,
};

function LeftLayoutAside(props: Props): React.Node {
  const { setModal } = props;
  return (
    <aside className={css.container}>
      <CommunityPicker setModal={setModal} />
      <AppSwitcher />
    </aside>
  );
}

export default LeftLayoutAside;
