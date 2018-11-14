// @flow

import * as React from 'react';
import { Header } from 'react-navigation-stack';

import DisconnectedBar from './disconnected-bar.react';

export default function CustomHeader(props: *) {
  return (
    <React.Fragment>
      <Header {...props} />
      <DisconnectedBar />
    </React.Fragment>
  );
}
