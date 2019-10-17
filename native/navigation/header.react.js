// @flow

import * as React from 'react';
import { Header } from 'react-navigation-stack';
import { View } from 'react-native';

import DisconnectedBar from './disconnected-bar.react';

export default function CustomHeader(props: React.ElementProps<typeof Header>) {
  return (
    <View>
      <Header {...props} />
      <DisconnectedBar />
    </View>
  );
}
