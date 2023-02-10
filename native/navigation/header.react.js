// @flow

import { Header, type StackHeaderProps } from '@react-navigation/stack';
import * as React from 'react';

import DisconnectedBar from './disconnected-bar.react.js';

type Props = {
  ...StackHeaderProps,
  +activeTab: boolean,
};
export default function CustomHeader(props: Props): React.Node {
  const { activeTab, ...rest } = props;
  return (
    <>
      <Header {...rest} />
      <DisconnectedBar visible={activeTab} />
    </>
  );
}
