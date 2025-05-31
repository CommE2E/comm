// @flow

import * as React from 'react';
import { View, ActivityIndicator } from 'react-native';

import Button from './button.react.js';
import { useStyles, useColors } from '../themes/colors.js';

type LoadableContentProps = {
  +children: React.Node,
  +isLoading: boolean,
};

function LoadableContent(props: LoadableContentProps): React.Node {
  const { children, isLoading } = props;

  const styles = useStyles(unboundStyles);
  const colors = useColors();

  const buttonContentContainerStyles = React.useMemo(() => {
    const result: Array<$Values<typeof styles>> = [styles.container];

    if (isLoading) {
      result.push(styles.containerLoading);
    }

    return result;
  }, [isLoading, styles]);

  const loadingSpinner = React.useMemo(() => {
    if (!isLoading) {
      return null;
    }

    return (
      <ActivityIndicator
        size="small"
        color={colors.whiteText}
        style={styles.loadingSpinner}
      />
    );
  }, [colors.whiteText, isLoading, styles.loadingSpinner]);

  return (
    <>
      <View style={buttonContentContainerStyles}>{children}</View>
      {loadingSpinner}
    </>
  );
}

type Props = {
  ...React.ElementConfig<typeof Button>,
  +isLoading: boolean,
};

function LoadableButton(props: Props): React.Node {
  const { isLoading, children, ...rest } = props;

  return (
    <Button disabled={isLoading} {...rest}>
      <LoadableContent isLoading={isLoading}>{props.children}</LoadableContent>
    </Button>
  );
}

const unboundStyles = {
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  containerLoading: {
    opacity: 0,
  },
  loadingSpinner: {
    position: 'absolute',
  },
};

export default LoadableButton;
