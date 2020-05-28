// @flow

import * as React from 'react';
import { Header, type StackHeaderProps } from '@react-navigation/stack';

import DisconnectedBar from './disconnected-bar.react';

type Props = {|
  ...StackHeaderProps,
  activeTab: boolean,
|};
export default function CustomHeader(props: Props) {
  const { activeTab, ...rest } = props;
  return (
    <>
      <Header {...rest} />
      <DisconnectedBar visible={activeTab} />
    </>
  );
}
