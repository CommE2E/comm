// @flow

import * as React from 'react';
import { Text } from 'react-native';

import type { ReactElement } from 'lib/shared/markdown';

import { MessageContext } from '../chat/message-context.react';
import { useStyles } from '../themes/colors';
import { MarkdownContext } from './markdown-context';

type MarkdownSpoilerProps = {
  +identifier: string | number | void,
  +text: ReactElement,
  +children?: React.Node,
};

function MarkdownSpoiler(props: MarkdownSpoilerProps): React.Node {
  const markdownContext = React.useContext(MarkdownContext);
  const messageContext = React.useContext(MessageContext);
  const styles = useStyles(unboundStyles);

  const [styleBasedOnState, setStyleBasedOnState] = React.useState(
    styles.spoilerHidden,
  );

  const { messageID } = messageContext;
  const { text, identifier } = props;

  const setSpoilerRevealed = markdownContext?.setSpoilerRevealed;
  const spoilerRevealed = markdownContext?.spoilerRevealed;
  const setSpoilerPressActive = markdownContext?.setSpoilerPressActive;

  const onSpoilerClick = React.useCallback(() => {
    if (styleBasedOnState === null) {
      setSpoilerPressActive && setSpoilerPressActive(false);
      return;
    }

    if (spoilerRevealed && setSpoilerRevealed && messageID && identifier) {
      setSpoilerRevealed({
        ...spoilerRevealed,
        [messageID]: { ...spoilerRevealed[messageID], [identifier]: true },
      });
    }
    setSpoilerPressActive && setSpoilerPressActive(true);
    setStyleBasedOnState(null);
  }, [
    setSpoilerPressActive,
    spoilerRevealed,
    setSpoilerRevealed,
    messageID,
    identifier,
    styleBasedOnState,
  ]);

  const memoizedSpoiler = React.useMemo(() => {
    return (
      <Text onPress={onSpoilerClick} style={styleBasedOnState}>
        {text}
      </Text>
    );
  }, [onSpoilerClick, styleBasedOnState, text]);

  return memoizedSpoiler;
}

const unboundStyles = {
  spoilerHidden: {
    color: 'spoiler',
    backgroundColor: 'spoiler',
  },
};

export default MarkdownSpoiler;
