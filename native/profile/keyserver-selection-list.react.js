// @flow

import * as React from 'react';
import { Text, View, FlatList } from 'react-native';

import { selectedKeyserversSelector } from 'lib/selectors/keyserver-selectors.js';
import type { SelectedKeyserverInfo } from 'lib/types/keyserver-types.js';

import KeyserverSelectionListItem from './keyserver-selection-list-item.react.js';
import type { ProfileNavigationProp } from './profile.react.js';
import type { NavigationRoute } from '../navigation/route-names.js';
import { useSelector } from '../redux/redux-utils.js';
import { useStyles } from '../themes/colors.js';

function keyExtractor(item: SelectedKeyserverInfo) {
  return `${item.keyserverAdminUserInfo.id}${item.keyserverInfo.urlPrefix}`;
}

function renderKeyserverListItem({
  item,
}: {
  +item: SelectedKeyserverInfo,
  ...
}) {
  return <KeyserverSelectionListItem {...item} />;
}

type Props = {
  +navigation: ProfileNavigationProp<'KeyserverSelectionList'>,
  +route: NavigationRoute<'KeyserverSelectionList'>,
};
// eslint-disable-next-line no-unused-vars
function KeyserverSelectionList(props: Props): React.Node {
  const styles = useStyles(unboundStyles);

  const selectedKeyserverInfos: $ReadOnlyArray<SelectedKeyserverInfo> =
    useSelector(selectedKeyserversSelector);

  const keyserverListSeparatorComponent = React.useCallback(
    () => <View style={styles.separator} />,
    [styles.separator],
  );

  const keyserverSelectionList = React.useMemo(
    () => (
      <View style={styles.container}>
        <Text style={styles.header}>CONNECTED KEYSERVERS</Text>
        <FlatList
          data={selectedKeyserverInfos}
          renderItem={renderKeyserverListItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.keyserverListContentContainer}
          ItemSeparatorComponent={keyserverListSeparatorComponent}
        />
      </View>
    ),
    [
      keyserverListSeparatorComponent,
      selectedKeyserverInfos,
      styles.container,
      styles.header,
      styles.keyserverListContentContainer,
    ],
  );

  return keyserverSelectionList;
}

const unboundStyles = {
  container: {
    flex: 1,
    backgroundColor: 'panelBackground',
    paddingTop: 24,
  },
  header: {
    color: 'panelBackgroundLabel',
    fontSize: 12,
    fontWeight: '400',
    paddingBottom: 3,
    paddingHorizontal: 24,
  },
  keyserverListContentContainer: {
    backgroundColor: 'panelForeground',
    borderBottomWidth: 1,
    borderColor: 'panelForegroundBorder',
    borderTopWidth: 1,
    marginBottom: 24,
    paddingVertical: 2,
  },
  separator: {
    backgroundColor: 'panelForegroundBorder',
    height: 1,
    marginHorizontal: 16,
  },
  onlineIndicatorOuter: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'greenIndicatorOuter',
    width: 18,
    height: 18,
    borderRadius: 9,
  },
  onlineIndicatorInner: {
    backgroundColor: 'greenIndicatorInner',
    width: 9,
    height: 9,
    borderRadius: 4.5,
  },
  offlineIndicatorOuter: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'redIndicatorOuter',
    width: 18,
    height: 18,
    borderRadius: 9,
  },
  offlineIndicatorInner: {
    backgroundColor: 'redIndicatorInner',
    width: 9,
    height: 9,
    borderRadius: 4.5,
  },
};

export default KeyserverSelectionList;
