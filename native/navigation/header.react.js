// @flow

import type { HeaderProps } from 'react-navigation-stack';

import * as React from 'react';
import { Header } from 'react-navigation-stack';
import { View } from 'react-native';

import DisconnectedBar from './disconnected-bar.react';

type Props = {|
  activeTab: boolean,
  ...$Exact<HeaderProps>,
|};
export default function CustomHeader(props: Props) {
  const { activeTab, ...rest } = props;
  return (
    <View>
      <Header {...rest} />
      <DisconnectedBar visible={activeTab} />
    </View>
  );
}
