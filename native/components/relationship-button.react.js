// @flow

import Icon from '@expo/vector-icons/FontAwesome5.js';
import * as React from 'react';
import { Text, ActivityIndicator } from 'react-native';

import Button from './button.react.js';
import { useStyles, useColors } from '../themes/colors.js';

type ButtonSize = 'S';

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
  +size?: ButtonSize,
};

function RelationshipButton(props: Props): React.Node {
  const { type, onPress, isLoading, size } = props;

  const styles = useStyles(unboundStyles);
  const colors = useColors();

  const buttonStyle = React.useMemo(() => {
    const result = [styles.buttonContainer];

    if (size === 'S') {
      result.push(styles.smallButtonContainer);
    }

    if (type === 'add' || type === 'accept' || type === 'unblock') {
      result.push(styles.greenButton);
    } else {
      result.push(styles.redButton);
    }

    return result;
  }, [
    size,
    styles.buttonContainer,
    styles.greenButton,
    styles.redButton,
    styles.smallButtonContainer,
    type,
  ]);

  const buttonTextStyle = React.useMemo(() => {
    const result = [styles.buttonText];

    if (size === 'S') {
      result.push(styles.smallButtonText);
    }

    return result;
  }, [size, styles.buttonText, styles.smallButtonText]);

  let buttonText = 'Add friend';
  let icon = 'user-plus';
  if (type === 'withdraw') {
    buttonText = 'Withdraw friend request';
    icon = 'user-minus';
  } else if (type === 'accept') {
    buttonText = 'Accept friend request';
  } else if (type === 'reject') {
    buttonText = 'Reject friend request';
    icon = 'user-minus';
  } else if (type === 'block') {
    buttonText = 'Block user';
    icon = 'user-shield';
  } else if (type === 'unblock') {
    buttonText = 'Unblock user';
    icon = 'user-shield';
  }

  const buttonContent = React.useMemo(() => {
    if (isLoading) {
      return <ActivityIndicator size="small" color={colors.whiteText} />;
    }

    return (
      <>
        <Icon
          name={icon}
          size={16}
          color={colors.floatingButtonLabel}
          style={styles.buttonIcon}
        />
        <Text style={buttonTextStyle}>{buttonText}</Text>
      </>
    );
  }, [
    buttonText,
    buttonTextStyle,
    colors.floatingButtonLabel,
    colors.whiteText,
    icon,
    isLoading,
    styles.buttonIcon,
  ]);

  return (
    <Button style={buttonStyle} onPress={onPress} disabled={isLoading}>
      {buttonContent}
    </Button>
  );
}

const unboundStyles = {
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
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
  smallButtonContainer: {
    paddingVertical: 8,
  },
  smallButtonText: {
    fontSize: 11,
  },
};

export default RelationshipButton;
