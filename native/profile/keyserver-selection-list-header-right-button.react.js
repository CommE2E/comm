// @flow

import { useNavigation } from '@react-navigation/native';
import * as React from 'react';

import HeaderRightTextButton from '../navigation/header-right-text-button.react.js';
import { AddKeyserverRouteName } from '../navigation/route-names.js';

function KeyserverSelectionListHeaderRightButton(): React.Node {
  const { navigate } = useNavigation();

  const navigateToAddKeyserverScreen = React.useCallback(
    () => navigate(AddKeyserverRouteName),
    [navigate],
  );

  return (
    <HeaderRightTextButton label="Add" onPress={navigateToAddKeyserverScreen} />
  );
}

export default KeyserverSelectionListHeaderRightButton;
