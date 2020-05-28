// @flow

import * as React from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const edges = ['top'];

function InsetSafeAreaView(props: React.ElementProps<typeof View>) {
  return <SafeAreaView edges={edges} {...props} />;
}

export default InsetSafeAreaView;
