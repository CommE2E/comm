// @flow

import classNames from 'classnames';
import * as React from 'react';

import css from './disconnected-bar.css';
import { useNetworkConnected } from './keyserver-reachability-handler.js';

function DisconnectedBar(): React.Node {
  const isNetworkConnected = useNetworkConnected();
  if (isNetworkConnected) {
    return null;
  }
  const textClasses = classNames({
    [css.bar]: true,
    [css.disconnected]: !isNetworkConnected,
  });
  return <p className={textClasses}>{'DISCONNECTED'}</p>;
}

export default DisconnectedBar;
