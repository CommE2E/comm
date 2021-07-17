// @flow

export type EnabledApps = {
  +calendar: boolean,
  +wiki: boolean,
  +tasks: boolean,
  +files: boolean,
};

export type SupportedApps = $Keys<EnabledApps>;

export const defaultEnabledApps: EnabledApps = {
  calendar: false,
  wiki: false,
  tasks: false,
  files: false,
};

export const defaultWebEnabledApps: EnabledApps = {
  calendar: true,
  wiki: false,
  tasks: false,
  files: false,
};
