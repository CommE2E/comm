// @flow

import Icon from '@expo/vector-icons/FontAwesome5.js';
import * as React from 'react';
import { Text } from 'react-native';

import LoadableButton from './loadable-button.react.js';
import { useStyles, useColors } from '../themes/colors.js';

type RelationshipButtonType =
  | 'add'
  | 'withdraw'
  | 'accept'
  | 'reject'
  | 'block'
  | 'unblock';

type Props = {
  +type: RelationshipButtonType,
  +onPress: () => mixed,
  +isLoading: boolean,
};

function RelationshipButton(props: Props): React.Node {
  const { type, onPress, isLoading } = props;

  const styles = useStyles(unboundStyles);
  const colors = useColors();

  const buttonStyle = React.useMemo(() => {
    const result: Array<$Values<typeof styles>> = [styles.buttonContainer];

    if (type === 'add' || type === 'accept' || type === 'unblock') {
      result.push(styles.greenButton);
    } else {
      result.push(styles.redButton);
    }

    return result;
  }, [styles, type]);

  let buttonText = 'Add friend';
  let icon = 'user-plus';
  if (type === 'withdraw') {
    buttonText = 'Withdraw friend request';
    icon = 'user-minus';
  } else if (type === 'accept') {
    buttonText = 'Accept';
  } else if (type === 'reject') {
    buttonText = 'Reject';
    icon = 'user-minus';
  } else if (type === 'block') {
    buttonText = 'Block user';
    icon = 'user-shield';
  } else if (type === 'unblock') {
    buttonText = 'Unblock user';
    icon = 'user-shield';
  }

  return (
    <LoadableButton style={buttonStyle} onPress={onPress} isLoading={isLoading}>
      <Icon
        name={icon}
        size={22}
        color={colors.floatingButtonLabel}
        style={styles.buttonIcon}
      />
      <Text style={styles.buttonText}>{buttonText}</Text>
    </LoadableButton>
  );
}

const unboundStyles = {
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 8,
  },
  buttonIcon: {
    paddingRight: 8,
  },
  buttonText: {
    color: 'floatingButtonLabel',
  },
  greenButton: {
    backgroundColor: 'vibrantGreenButton',
  },
  redButton: {
    backgroundColor: 'vibrantRedButton',
  },
};

export default RelationshipButton;
