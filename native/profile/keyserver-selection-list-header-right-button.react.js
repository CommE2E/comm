// @flow

import { useNavigation } from '@react-navigation/native';
import * as React from 'react';

import HeaderRightAddButton from '../navigation/header-right-add-button.react.js';
import { AddKeyserverRouteName } from '../navigation/route-names.js';

function KeyserverSelectionListHeaderRightButton(): React.Node {
  const { navigate } = useNavigation();

  const navigateToAddKeyserverScreen = React.useCallback(
    () => navigate(AddKeyserverRouteName),
    [navigate],
  );

  return <HeaderRightAddButton onPress={navigateToAddKeyserverScreen} />;
}

export default KeyserverSelectionListHeaderRightButton;
