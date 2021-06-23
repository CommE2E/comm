// @flow

export type EnabledReports = {|
  +crashReports: boolean,
  +inconsistencyReports: boolean,
  +mediaReports: boolean,
|};

export type SupportedReports = $Keys<EnabledReports>;

export const defaultEnabledReports: EnabledReports = {
  crashReports: false,
  inconsistencyReports: false,
  mediaReports: false,
};
