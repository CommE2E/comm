// @flow

import classNames from 'classnames';
import * as React from 'react';

import { useNetworkConnected } from './disconnected-bar-visibility-handler.js';
import css from './disconnected-bar.css';

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
