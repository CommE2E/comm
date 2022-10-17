// @flow

import * as React from 'react';
import { Text } from 'react-native';

import type { ReactElement } from 'lib/shared/markdown';

import { useStyles } from '../themes/colors';

type SpoilerProps = {
  +text: ReactElement,
  +children?: React.Node,
};

function Spoiler(props: SpoilerProps): React.Node {
  const [isRevealed, setIsRevealed] = React.useState(false);
  const styles = useStyles(unboundStyles);
  const { text } = props;

  const onSpoilerClick = React.useCallback(() => {
    setIsRevealed(true);
  }, []);

  const memoizedSpoiler = React.useMemo(() => {
    return (
      <Text
        onPress={onSpoilerClick}
        style={!isRevealed ? styles.spoilerHidden : null}
      >
        {text}
      </Text>
    );
  }, [onSpoilerClick, isRevealed, styles.spoilerHidden, text]);

  return memoizedSpoiler;
}

const unboundStyles = {
  spoilerHidden: {
    color: 'spoiler',
    backgroundColor: 'spoiler',
  },
};

export default Spoiler;
