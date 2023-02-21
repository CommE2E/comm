// @flow

import * as React from 'react';

import { useModalContext } from 'lib/components/modal-provider.react.js';

import { useSelector } from '../../redux/redux-utils.js';
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
  const modalContext = useModalContext();

  const enabledApps = useSelector(state => state.enabledApps);

  const appData = React.useMemo(
    () =>
      APP_DIRECTORY_DATA.map(app => {
        const { defaultEnabled, ...data } = app;
        if (app.id === 'chat') {
          return {
            ...data,
            enabled: defaultEnabled,
          };
        }
        return {
          ...data,
          enabled: enabledApps[app.id],
        };
      }),
    [enabledApps],
  );

  const appItems = React.useMemo(
    () => appData.map(item => <AppListing key={item.id} {...item} />),
    [appData],
  );

  return (
    <Modal name="Choose Apps" onClose={modalContext.popModal} size="large">
      <div className={css.appsDirectoryContainer}>
        <div className={css.appsDirectoryList}>{appItems}</div>
      </div>
    </Modal>
  );
}

export default AppsModal;
