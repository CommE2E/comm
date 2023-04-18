// @flow

import Icon from '@expo/vector-icons/FontAwesome.js';
import { useNavigation } from '@react-navigation/native';
import * as React from 'react';
import { View, Text, FlatList, TouchableHighlight } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { ReactionInfo } from 'lib/selectors/chat-selectors.js';
import { useMessageReactionsList } from 'lib/shared/reaction-utils.js';

import UserAvatar from '../avatars/user-avatar.react.js';
import Modal from '../components/modal.react.js';
import type { RootNavigationProp } from '../navigation/root-navigator.react.js';
import type { NavigationRoute } from '../navigation/route-names.js';
import { useColors, useStyles } from '../themes/colors.js';
import { useShouldRenderAvatars } from '../utils/avatar-utils.js';

export type MessageReactionsModalParams = {
  +reactions: ReactionInfo,
};

type Props = {
  +navigation: RootNavigationProp<'MessageReactionsModal'>,
  +route: NavigationRoute<'MessageReactionsModal'>,
};
function MessageReactionsModal(props: Props): React.Node {
  const { reactions } = props.route.params;

  const styles = useStyles(unboundStyles);
  const colors = useColors();
  const navigation = useNavigation();

  const modalSafeAreaEdges = React.useMemo(() => ['top'], []);
  const modalContainerSafeAreaEdges = React.useMemo(() => ['bottom'], []);

  const close = React.useCallback(() => navigation.goBack(), [navigation]);

  const reactionsListData = useMessageReactionsList(reactions);

  const shouldRenderAvatars = useShouldRenderAvatars();
  const marginLeftStyle = React.useMemo(
    () => ({
      marginLeft: shouldRenderAvatars ? 8 : 0,
    }),
    [shouldRenderAvatars],
  );

  const renderItem = React.useCallback(
    ({ item }) => (
      <View key={item.id} style={styles.reactionsListRowContainer}>
        <View style={styles.reactionsListUserInfoContainer}>
          <UserAvatar size="small" userID={item.id} />
          <Text style={[styles.reactionsListUsernameText, marginLeftStyle]}>
            {item.username}
          </Text>
        </View>
        <Text style={styles.reactionsListReactionText}>{item.reaction}</Text>
      </View>
    ),
    [
      marginLeftStyle,
      styles.reactionsListReactionText,
      styles.reactionsListRowContainer,
      styles.reactionsListUserInfoContainer,
      styles.reactionsListUsernameText,
    ],
  );

  const itemSeperator = React.useCallback(() => {
    return <View style={styles.reactionsListItemSeperator} />;
  }, [styles.reactionsListItemSeperator]);

  return (
    <Modal
      modalStyle={styles.modalStyle}
      containerStyle={styles.modalContainerStyle}
      safeAreaEdges={modalSafeAreaEdges}
    >
      <SafeAreaView edges={modalContainerSafeAreaEdges}>
        <View style={styles.modalContentContainer}>
          <Text style={styles.reactionsListTitleText}>Reactions</Text>
          <TouchableHighlight
            onPress={close}
            style={styles.closeButton}
            underlayColor={colors.modalIosHighlightUnderlay}
          >
            <Icon name="close" size={16} style={styles.closeIcon} />
          </TouchableHighlight>
        </View>
        <FlatList
          data={reactionsListData}
          renderItem={renderItem}
          ItemSeparatorComponent={itemSeperator}
          contentContainerStyle={styles.reactionsListContentContainer}
        />
      </SafeAreaView>
    </Modal>
  );
}

const unboundStyles = {
  modalStyle: {
    // we need to set each margin property explicitly to override
    marginLeft: 0,
    marginRight: 0,
    marginBottom: 0,
    marginTop: 0,
    justifyContent: 'flex-end',
    flex: 0,
    borderWidth: 0,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  modalContainerStyle: {
    justifyContent: 'flex-end',
  },
  modalContentContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 8,
  },
  reactionsListContentContainer: {
    paddingBottom: 16,
  },
  reactionsListTitleText: {
    color: 'modalForegroundLabel',
    fontSize: 18,
  },
  reactionsListRowContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  reactionsListUserInfoContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  reactionsListUsernameText: {
    color: 'modalForegroundLabel',
    fontSize: 18,
  },
  reactionsListReactionText: {
    fontSize: 18,
  },
  reactionsListItemSeperator: {
    height: 16,
  },
  closeButton: {
    borderRadius: 4,
    width: 18,
    height: 18,
    alignItems: 'center',
  },
  closeIcon: {
    color: 'modalBackgroundSecondaryLabel',
  },
};

export default MessageReactionsModal;
