// @flow

import {
  type PendingMultimediaUpload,
  pendingMultimediaUploadPropType,
} from 'lib/types/media-types';

import * as React from 'react';
import PropTypes from 'prop-types';
import XCircleIcon from 'react-feather/dist/icons/x-circle';
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

  render() {
    const { uri, progressPercent } = this.props.pendingUpload;
    const removeButton = progressPercent === 0
      ? <XCircleIcon onClick={this.remove} className={css.removeUpload} />
      : null;
    let progressIndicator = null;
    if (progressPercent !== 0) {
      const outOfHundred = progressPercent * 100;
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
    return (
      <span className={css.preview}>
        <span className={css.previewImage}>
          <img src={uri} />
          {removeButton}
        </span>
        {progressIndicator}
      </span>
    );
  }

  remove = () => {
    this.props.remove(this.props.pendingUpload.localID);
  }

}

export default MultimediaPreview;
