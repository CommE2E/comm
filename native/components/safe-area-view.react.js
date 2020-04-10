// @flow

import * as React from 'react';
import { SafeAreaView } from 'react-navigation';

const forceInset = { top: 'always', bottom: 'never' };

type Props = {|
  style?: $PropertyType<React.ElementConfig<typeof SafeAreaView>, 'style'>,
  children?: React.Node,
|};
function InsetSafeAreaView(props: Props) {
  const { style, children } = props;
  return (
    <SafeAreaView forceInset={forceInset} style={style}>
      {children}
    </SafeAreaView>
  );
}

export default InsetSafeAreaView;
