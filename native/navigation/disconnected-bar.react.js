// @flow

import type { AppState } from '../redux/redux-setup';

import * as React from 'react';
import { View, Text, StyleSheet, LayoutAnimation } from 'react-native';
import PropTypes from 'prop-types';

import { connect } from 'lib/utils/redux-utils';

type Props = {|
  // Redux state
  showDisconnectedBar: bool,
|};
class DisconnectedBar extends React.PureComponent<Props> {

  static propTypes = {
    showDisconnectedBar: PropTypes.bool.isRequired,
  };

  componentDidUpdate(prevProps: Props) {
    if (this.props.showDisconnectedBar !== prevProps.showDisconnectedBar) {
      LayoutAnimation.easeInEaseOut();
    }
  }

  render() {
    const disconnectedBarStyles = [ styles.disconnectedBar ];
    let text;
    if (this.props.showDisconnectedBar) {
      text = <Text style={styles.disconnectedText}>DISCONNECTED</Text>;
    } else {
      disconnectedBarStyles.push(styles.hiddenDisconnectedBar);
    }
    return <View style={disconnectedBarStyles}>{text}</View>;
  }

}

const styles = StyleSheet.create({
  disconnectedBar: {
    backgroundColor: '#CC0000',
    padding: 5,
  },
  hiddenDisconnectedBar: {
    height: 0,
    padding: 0,
  },
  disconnectedText: {
    fontSize: 14,
    textAlign: 'center',
    color: 'white',
  },
});

export default connect((state: AppState) => ({
  showDisconnectedBar: state.connection.showDisconnectedBar,
}))(DisconnectedBar);
