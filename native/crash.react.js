// @flow

import Icon from '@expo/vector-icons/FontAwesome.js';
import Clipboard from '@react-native-clipboard/clipboard';
import invariant from 'invariant';
import _shuffle from 'lodash/fp/shuffle.js';
import * as React from 'react';
import {
  View,
  Text,
  Platform,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';

import {
  sendReportActionTypes,
  sendReport,
} from 'lib/actions/report-actions.js';
import { logOutActionTypes, logOut } from 'lib/actions/user-actions.js';
import { preRequestUserStateSelector } from 'lib/selectors/account-selectors.js';
import type { LogOutResult } from 'lib/types/account-types.js';
import {
  type ErrorData,
  type ClientReportCreationRequest,
  type ReportCreationResponse,
  reportTypes,
} from 'lib/types/report-types.js';
import type { PreRequestUserState } from 'lib/types/session-types.js';
import { actionLogger } from 'lib/utils/action-logger.js';
import {
  type DispatchActionPromise,
  useServerCall,
  useDispatchActionPromise,
} from 'lib/utils/action-utils.js';
import { useIsReportEnabled } from 'lib/utils/report-utils.js';
import {
  sanitizeReduxReport,
  type ReduxCrashReport,
} from 'lib/utils/sanitization.js';
import sleep from 'lib/utils/sleep.js';

import Button from './components/button.react.js';
import ConnectedStatusBar from './connected-status-bar.react.js';
import { commCoreModule } from './native-modules.js';
import { persistConfig, codeVersion } from './redux/persist.js';
import { useSelector } from './redux/redux-utils.js';
import { wipeAndExit } from './utils/crash-utils.js';

const errorTitles = ['Oh no!!', 'Womp womp womp...'];

type BaseProps = {
  +errorData: $ReadOnlyArray<ErrorData>,
};
type Props = {
  ...BaseProps,
  // Redux state
  +preRequestUserState: PreRequestUserState,
  // Redux dispatch functions
  +dispatchActionPromise: DispatchActionPromise,
  // async functions that hit server APIs
  +sendReport: (
    request: ClientReportCreationRequest,
  ) => Promise<ReportCreationResponse>,
  +logOut: (preRequestUserState: PreRequestUserState) => Promise<LogOutResult>,
  +crashReportingEnabled: boolean,
};
type State = {
  +errorReportID: ?string,
  +doneWaiting: boolean,
};
class Crash extends React.PureComponent<Props, State> {
  errorTitle = _shuffle(errorTitles)[0];

  constructor(props) {
    super(props);
    this.state = {
      errorReportID: null,
      doneWaiting: !props.crashReportingEnabled,
    };
  }

  componentDidMount() {
    if (this.state.doneWaiting) {
      return;
    }
    this.props.dispatchActionPromise(sendReportActionTypes, this.sendReport());
    this.timeOut();
  }

  async timeOut() {
    // If it takes more than 10s, give up and let the user exit
    await sleep(10000);
    this.setState({ doneWaiting: true });
  }

  render() {
    const errorText = [...this.props.errorData]
      .reverse()
      .map(errorData => errorData.error.message)
      .join('\n');

    let crashID;
    if (!this.state.doneWaiting) {
      crashID = <ActivityIndicator size="small" color="black" />;
    } else if (this.state.doneWaiting && this.state.errorReportID) {
      crashID = (
        <View style={styles.crashID}>
          <Text style={styles.crashIDText}>Crash report ID:</Text>
          <View style={styles.errorReportID}>
            <Text style={styles.errorReportIDText}>
              {this.state.errorReportID}
            </Text>
            <Button onPress={this.onCopyCrashReportID}>
              <Text style={styles.copyCrashReportIDButtonText}>(Copy)</Text>
            </Button>
          </View>
        </View>
      );
    } else {
      crashID = (
        <Text style={styles.text}>
          Crash reporting can be enabled in the Profile tab.
        </Text>
      );
    }

    const buttonStyle = { opacity: Number(this.state.doneWaiting) };

    return (
      <View style={styles.container}>
        <ConnectedStatusBar barStyle="dark-content" />
        <Icon name="bug" size={32} color="red" />
        <Text style={styles.header}>{this.errorTitle}</Text>
        <Text style={styles.text}>I&apos;m sorry, but the app crashed.</Text>
        {crashID}
        <Text style={styles.text}>
          Here&apos;s some text that&apos;s probably not helpful:
        </Text>
        <ScrollView style={styles.scrollView}>
          <Text style={styles.errorText}>{errorText}</Text>
        </ScrollView>
        <View style={[styles.buttons, buttonStyle]}>
          <Button onPress={this.onPressKill} style={styles.button}>
            <Text style={styles.buttonText}>Kill the app</Text>
          </Button>
          <Button onPress={this.onPressWipe} style={styles.button}>
            <Text style={styles.buttonText}>Wipe state and kill app</Text>
          </Button>
        </View>
      </View>
    );
  }

  async sendReport() {
    const sanitizedReduxReport: ReduxCrashReport = sanitizeReduxReport({
      preloadedState: actionLogger.preloadedState,
      currentState: actionLogger.currentState,
      actions: actionLogger.actions,
    });
    const result = await this.props.sendReport({
      type: reportTypes.ERROR,
      platformDetails: {
        platform: Platform.OS,
        codeVersion,
        stateVersion: persistConfig.version,
      },
      errors: this.props.errorData.map(data => ({
        errorMessage: data.error.message,
        stack: data.error.stack,
        componentStack: data.info && data.info.componentStack,
      })),
      ...sanitizedReduxReport,
    });
    this.setState({
      errorReportID: result.id,
      doneWaiting: true,
    });
  }

  onPressKill = () => {
    if (!this.state.doneWaiting) {
      return;
    }
    commCoreModule.terminate();
  };

  onPressWipe = async () => {
    if (!this.state.doneWaiting) {
      return;
    }
    this.props.dispatchActionPromise(logOutActionTypes, this.logOutAndExit());
  };

  async logOutAndExit() {
    try {
      await this.props.logOut(this.props.preRequestUserState);
    } catch (e) {}
    await wipeAndExit();
  }

  onCopyCrashReportID = () => {
    invariant(this.state.errorReportID, 'should be set');
    Clipboard.setString(this.state.errorReportID);
  };
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#FF0000',
    borderRadius: 5,
    marginHorizontal: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
  },
  buttons: {
    flexDirection: 'row',
  },
  container: {
    alignItems: 'center',
    backgroundColor: 'white',
    flex: 1,
    justifyContent: 'center',
  },
  copyCrashReportIDButtonText: {
    color: '#036AFF',
  },
  crashID: {
    flexDirection: 'row',
    paddingBottom: 12,
    paddingTop: 2,
  },
  crashIDText: {
    color: 'black',
    paddingRight: 8,
  },
  errorReportID: {
    flexDirection: 'row',
    height: 20,
  },
  errorReportIDText: {
    color: 'black',
    paddingRight: 8,
  },
  errorText: {
    color: 'black',
    fontFamily: Platform.select({
      ios: 'Menlo',
      default: 'monospace',
    }),
  },
  header: {
    color: 'black',
    fontSize: 24,
    paddingBottom: 24,
  },
  scrollView: {
    flex: 1,
    marginBottom: 24,
    marginTop: 12,
    maxHeight: 200,
    paddingHorizontal: 50,
  },
  text: {
    color: 'black',
    paddingBottom: 12,
  },
});

const ConnectedCrash: React.ComponentType<BaseProps> = React.memo<BaseProps>(
  function ConnectedCrash(props: BaseProps) {
    const preRequestUserState = useSelector(preRequestUserStateSelector);

    const dispatchActionPromise = useDispatchActionPromise();
    const callSendReport = useServerCall(sendReport);
    const callLogOut = useServerCall(logOut);
    const crashReportingEnabled = useIsReportEnabled('crashReports');
    return (
      <Crash
        {...props}
        preRequestUserState={preRequestUserState}
        dispatchActionPromise={dispatchActionPromise}
        sendReport={callSendReport}
        logOut={callLogOut}
        crashReportingEnabled={crashReportingEnabled}
      />
    );
  },
);

export default ConnectedCrash;
