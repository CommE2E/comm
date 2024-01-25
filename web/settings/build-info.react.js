// @flow

import * as React from 'react';

import { useStaffContext } from 'lib/components/staff-provider.react.js';
import { useIsCurrentUserStaff } from 'lib/shared/staff-utils.js';
import { getConfig } from 'lib/utils/config.js';
import { isDev } from 'lib/utils/dev-utils.js';

import css from './build-info.css';
import { useStaffCanSee } from '../utils/staff-utils.js';

function BuildInfo(): React.Node {
  const { codeVersion, stateVersion } = getConfig().platformDetails;

  const { staffUserHasBeenLoggedIn } = useStaffContext();

  const staffCanSee = useStaffCanSee();

  const isCurrentUserStaff = useIsCurrentUserStaff();

  const staffOnlyRows = React.useMemo(() => {
    if (!staffCanSee && !staffUserHasBeenLoggedIn) {
      return null;
    }

    return (
      <>
        <div className={css.infoRow}>
          <p className={css.labelText}>__DEV__</p>
          <p className={css.valueText}>{isDev ? 'TRUE' : 'FALSE'}</p>
        </div>
        <div className={css.infoRow}>
          <p className={css.labelText}>isCurrentUserStaff</p>
          <p className={css.valueText}>
            {isCurrentUserStaff ? 'TRUE' : 'FALSE'}
          </p>
        </div>
        <div className={css.infoRow}>
          <p className={css.labelText}>hasStaffUserLoggedIn</p>
          <p className={css.valueText}>
            {staffUserHasBeenLoggedIn ? 'TRUE' : 'FALSE'}
          </p>
        </div>
      </>
    );
  }, [isCurrentUserStaff, staffCanSee, staffUserHasBeenLoggedIn]);

  return (
    <div className={css.contentContainer}>
      <div className={css.infoRow}>
        <p className={css.labelText}>Code version</p>
        <p className={css.valueText}>{codeVersion}</p>
      </div>
      <div className={css.infoRow}>
        <p className={css.labelText}>State version</p>
        <p className={css.valueText}>{stateVersion}</p>
      </div>
      {staffOnlyRows}
    </div>
  );
}

export default BuildInfo;
