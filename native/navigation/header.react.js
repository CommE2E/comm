// @flow

import * as React from 'react';
import { Header } from 'react-navigation-stack';

import DisconnectedBar from './disconnected-bar.react';

export default function CustomHeader(props: React.ElementProps<typeof Header>) {
  return (
    <>
      <Header {...props} />
      <DisconnectedBar />
    </>
  );
}
