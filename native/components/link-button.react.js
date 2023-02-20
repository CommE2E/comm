// @flow

import * as React from 'react';
import { Text } from 'react-native';

import Button from './button.react.js';
import { useStyles } from '../themes/colors.js';
import type { ViewStyle } from '../types/styles.js';

type BaseProps = {
  +text: string,
  +onPress: () => void,
  +disabled?: boolean,
  +style?: ViewStyle,
};
type Props = {
  ...BaseProps,
  +styles: typeof unboundStyles,
};
class LinkButton extends React.PureComponent<Props> {
  render() {
    const disabledStyle = this.props.disabled
      ? this.props.styles.disabled
      : null;
    return (
      <Button
        onPress={this.props.onPress}
        androidBorderlessRipple={true}
        iosActiveOpacity={0.85}
        disabled={!!this.props.disabled}
        style={this.props.style}
      >
        <Text style={[this.props.styles.text, disabledStyle]}>
          {this.props.text}
        </Text>
      </Button>
    );
  }
}

const unboundStyles = {
  disabled: {
    color: 'modalBackgroundSecondaryLabel',
  },
  text: {
    color: 'link',
    fontSize: 17,
    paddingHorizontal: 10,
  },
};

const ConnectedLinkButton: React.ComponentType<BaseProps> =
  React.memo<BaseProps>(function ConnectedLinkButton(props: BaseProps) {
    const styles = useStyles(unboundStyles);

    return <LinkButton {...props} styles={styles} />;
  });

export default ConnectedLinkButton;
