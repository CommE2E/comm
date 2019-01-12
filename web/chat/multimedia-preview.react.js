// @flow

import {
  type PendingMultimediaUpload,
  pendingMultimediaUploadPropType,
} from './chat-input-state';

import * as React from 'react';
import PropTypes from 'prop-types';
import XCircleIcon from 'react-feather/dist/icons/x-circle';
import AlertCircleIcon from 'react-feather/dist/icons/alert-circle';
import CircularProgressbar from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';

import css from './chat-message-list.css';

type Props = {|
  pendingUpload: PendingMultimediaUpload,
  remove: (uploadID: string) => void,
|};
class MultimediaPreview extends React.PureComponent<Props> {

  static propTypes = {
    pendingUpload: pendingMultimediaUploadPropType.isRequired,
    remove: PropTypes.func.isRequired,
  };

  componentDidUpdate(prevProps: Props) {
    if (
      this.props.pendingUpload.uri !== prevProps.pendingUpload.uri &&
      !prevProps.pendingUpload.uriIsReal
    ) {
      URL.revokeObjectURL(prevProps.pendingUpload.uri);
    }
  }

  render() {
    const { uri, progressPercent, failed } = this.props.pendingUpload;

    let progressIndicator = null;
    if (progressPercent !== 0 && progressPercent !== 1) {
      const outOfHundred = Math.floor(progressPercent * 100);
      const text = `${outOfHundred}%`;
      progressIndicator = (
        <CircularProgressbar
          percentage={outOfHundred}
          text={text}
          background
          backgroundPadding={6}
          className={css.progressIndicator}
        />
      );
    }

    let errorIndicator = null;
    if (failed) {
      errorIndicator = (
        <AlertCircleIcon
          className={css.uploadError}
          size={36}
        />
      );
    }

    return (
      <span className={css.preview}>
        <span className={css.previewImage}>
          <img src={uri} />
          <XCircleIcon onClick={this.remove} className={css.removeUpload} />
        </span>
        {progressIndicator}
        {errorIndicator}
      </span>
    );
  }

  remove = () => {
    this.props.remove(this.props.pendingUpload.localID);
  }

}

export default MultimediaPreview;
