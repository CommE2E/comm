// @flow

import { useFocusEffect } from '@react-navigation/native';
import * as React from 'react';
import { Text } from 'react-native';

import { useMarkdownOnPressUtils } from './markdown-utils.js';
import { getMarkdownStyles } from './styles.js';
import { useNavigateToUserProfileBottomSheet } from '../user-profile/user-profile-utils.js';

type TextProps = React.ElementConfig<typeof Text>;
type Props = {
  +children: React.Node,
  +userID: string,
  +useDarkStyle: boolean,
  ...TextProps,
};

function MarkdownUserMention(props: Props): React.Node {
  const { userID, useDarkStyle, ...rest } = props;

  const { messageKey, isRevealed, onLongPressHandler, markdownContext } =
    useMarkdownOnPressUtils();

  const markdownStyles = React.useMemo(
    () => getMarkdownStyles(useDarkStyle ? 'dark' : 'light'),
    [useDarkStyle],
  );

  const { setUserProfileBottomSheetActive } = markdownContext;

  const navigateToUserProfileBottomSheet =
    useNavigateToUserProfileBottomSheet();

  const onFocusCallback = React.useCallback(() => {
    if (!messageKey) {
      return;
    }

    setUserProfileBottomSheetActive({ [messageKey]: false });
  }, [messageKey, setUserProfileBottomSheetActive]);

  useFocusEffect(onFocusCallback);

  const onPressUser = React.useCallback(() => {
    if (!messageKey) {
      return;
    }

    setUserProfileBottomSheetActive({ [messageKey]: true });
    navigateToUserProfileBottomSheet(userID);
  }, [
    messageKey,
    navigateToUserProfileBottomSheet,
    setUserProfileBottomSheetActive,
    userID,
  ]);

  const markdownUserMention = React.useMemo(
    () => (
      <Text
        onPress={isRevealed ? onPressUser : null}
        onLongPress={isRevealed ? onLongPressHandler : null}
        style={markdownStyles.bold}
        {...rest}
      />
    ),
    [isRevealed, onLongPressHandler, onPressUser, rest, markdownStyles.bold],
  );

  return markdownUserMention;
}

export default MarkdownUserMention;
