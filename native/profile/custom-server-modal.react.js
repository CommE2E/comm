// @flow

import * as React from 'react';
import { Text } from 'react-native';
import { useDispatch } from 'react-redux';

import type { Dispatch } from 'lib/types/redux-types.js';
import { setURLPrefix } from 'lib/utils/url-utils.js';

import Button from '../components/button.react.js';
import Modal from '../components/modal.react.js';
import TextInput from '../components/text-input.react.js';
import type { RootNavigationProp } from '../navigation/root-navigator.react.js';
import type { NavigationRoute } from '../navigation/route-names.js';
import { useSelector } from '../redux/redux-utils.js';
import { useStyles } from '../themes/colors.js';
import { setCustomServer } from '../utils/url-utils.js';

export type CustomServerModalParams = {
  +presentedFrom: string,
};

type BaseProps = {
  +navigation: RootNavigationProp<'CustomServerModal'>,
  +route: NavigationRoute<'CustomServerModal'>,
};
type Props = {
  ...BaseProps,
  +urlPrefix: string,
  +customServer: ?string,
  +styles: typeof unboundStyles,
  +dispatch: Dispatch,
};
type State = {
  +customServer: string,
};
class CustomServerModal extends React.PureComponent<Props, State> {
  constructor(props: Props) {
    super(props);
    const { customServer } = props;
    this.state = {
      customServer: customServer ? customServer : '',
    };
  }

  render() {
    return (
      <Modal
        containerStyle={this.props.styles.container}
        modalStyle={this.props.styles.modal}
      >
        <TextInput
          style={this.props.styles.textInput}
          value={this.state.customServer}
          onChangeText={this.onChangeCustomServer}
          autoFocus={true}
        />
        <Button onPress={this.onPressGo} style={this.props.styles.button}>
          <Text style={this.props.styles.buttonText}>Go</Text>
        </Button>
      </Modal>
    );
  }

  onChangeCustomServer = (newCustomServer: string) => {
    this.setState({ customServer: newCustomServer });
  };

  onPressGo = () => {
    const { customServer } = this.state;
    if (customServer !== this.props.urlPrefix) {
      this.props.dispatch({
        type: setURLPrefix,
        payload: customServer,
      });
    }
    if (customServer && customServer !== this.props.customServer) {
      this.props.dispatch({
        type: setCustomServer,
        payload: customServer,
      });
    }
    this.props.navigation.goBackOnce();
  };
}

const unboundStyles = {
  button: {
    backgroundColor: 'vibrantGreenButton',
    borderRadius: 5,
    marginHorizontal: 2,
    marginVertical: 2,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    textAlign: 'center',
  },
  container: {
    justifyContent: 'flex-end',
  },
  modal: {
    flex: 0,
    flexDirection: 'row',
  },
  textInput: {
    color: 'modalBackgroundLabel',
    flex: 1,
    fontSize: 16,
    margin: 0,
    padding: 0,
    borderBottomColor: 'transparent',
  },
};

const ConnectedCustomServerModal: React.ComponentType<BaseProps> =
  React.memo<BaseProps>(function ConnectedCustomServerModal(props: BaseProps) {
    const urlPrefix = useSelector(state => state.urlPrefix);
    const customServer = useSelector(state => state.customServer);
    const styles = useStyles(unboundStyles);
    const dispatch = useDispatch();

    return (
      <CustomServerModal
        {...props}
        urlPrefix={urlPrefix}
        customServer={customServer}
        styles={styles}
        dispatch={dispatch}
      />
    );
  });

export default ConnectedCustomServerModal;
