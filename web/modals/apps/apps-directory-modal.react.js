// @flow

import * as React from 'react';
import { useSelector } from 'react-redux';

import { useModalContext } from 'lib/components/modal-provider.react.js';

import AppListing from '../apps/app-listing.react.js';
import css from '../apps/apps.css';
import Modal from '../modal.react.js';

const APP_DIRECTORY_DATA = [
  {
    id: 'chat',
    defaultEnabled: true,
    readOnly: true,
    name: 'Chat',
    icon: 'message-square',
    copy: 'Keep in touch with your community',
  },
  {
    id: 'calendar',
    defaultEnabled: true,
    readOnly: false,
    name: 'Calendar',
    icon: 'calendar',
    copy: 'Shared calendar for your community',
  },
];

function AppsModal(): React.Node {
  const { popModal } = useModalContext();

  const enabledApps = useSelector(state => state.enabledApps);

  const appData = React.useMemo(
    () =>
      APP_DIRECTORY_DATA.map(app => {
        const { defaultEnabled, ...data } = app;
        return {
          ...data,
          enabled: enabledApps[app.id] ?? defaultEnabled,
        };
      }),
    [enabledApps],
  );

  const appItems = React.useMemo(
    () => appData.map(item => <AppListing key={item.id} {...item} />),
    [appData],
  );

  return (
    <Modal name="Choose apps" onClose={popModal} size="large">
      <div className={css.appsDirectoryContainer}>
        <div className={css.appsDirectoryList}>{appItems}</div>
      </div>
    </Modal>
  );
}

export default AppsModal;
