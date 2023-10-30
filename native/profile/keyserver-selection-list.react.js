// @flow

import * as React from 'react';
import { Text, View, FlatList } from 'react-native';

import { selectedKeyserversSelector } from 'lib/selectors/keyserver-selectors.js';
import type { SelectedKeyserverInfos } from 'lib/types/keyserver-types.js';

import CommIcon from '../components/comm-icon.react.js';
import Pill from '../components/pill.react.js';
import { useSelector } from '../redux/redux-utils.js';
import { useStyles, useColors } from '../themes/colors.js';

function keyExtractor(item: SelectedKeyserverInfos) {
  return `${item.keyserverAdminUsername}${item.keyserverInfo.urlPrefix}`;
}

// eslint-disable-next-line no-unused-vars
function KeyserverSelectionList(props: { ... }): React.Node {
  const styles = useStyles(unboundStyles);
  const colors = useColors();

  const selectedKeyserverInfos: $ReadOnlyArray<SelectedKeyserverInfos> =
    useSelector(selectedKeyserversSelector);

  const cloudIcon = React.useMemo(
    () => (
      <CommIcon
        name="cloud-filled"
        size={12}
        color={colors.panelForegroundLabel}
      />
    ),
    [colors.panelForegroundLabel],
  );

  const renderKeyserverListItem = React.useCallback(
    ({ item }) => {
      const { keyserverAdminUsername, keyserverInfo } = item;

      let connectionIndicatorOuterStyle = styles.offlineIndicatorOuter;
      let connectionIndicatorInnerStyle = styles.offlineIndicatorInner;

      if (keyserverInfo.connection.status === 'connected') {
        connectionIndicatorOuterStyle = styles.onlineIndicatorOuter;
        connectionIndicatorInnerStyle = styles.onlineIndicatorInner;
      }

      return (
        <View style={styles.keyserverListItemContainer}>
          <Pill
            label={keyserverAdminUsername}
            backgroundColor={colors.codeBackground}
            icon={cloudIcon}
          />
          <View style={connectionIndicatorOuterStyle}>
            <View style={connectionIndicatorInnerStyle} />
          </View>
        </View>
      );
    },
    [
      cloudIcon,
      colors.codeBackground,
      styles.keyserverListItemContainer,
      styles.offlineIndicatorInner,
      styles.offlineIndicatorOuter,
      styles.onlineIndicatorInner,
      styles.onlineIndicatorOuter,
    ],
  );

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
      renderKeyserverListItem,
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
  keyserverListItemContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 10,
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
