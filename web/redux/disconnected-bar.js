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
    [css.connecting]: !isNetworkConnected,
  });
  return <p className={textClasses}>{'CONNECTING…'}</p>;
}

export default DisconnectedBar;
