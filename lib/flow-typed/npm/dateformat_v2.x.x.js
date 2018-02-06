// flow-typed signature: 0bdba8c35f59eddc6a1f4a2e8548bcb3
// flow-typed version: b43dff3e0e/dateformat_v2.x.x/flow_>=v0.28.x

interface DateFormatMasks {
  default: string;
  shortDate: string;
  mediumDate: string;
  longDate: string;
  fullDate: string;
  shortTime: string;
  mediumTime: string;
  longTime: string;
  isoDate: string;
  isoTime: string;
  isoDateTime: string;
  isoUtcDateTime: string;
  expiresHeaderFormat: string;
  [key: string]: string;
}

interface DateFormatI18n {
  dayNames: string[];
  monthNames: string[];
}

interface DateFormatStatic {
  (date ? : Date | string | number, mask ? : string, utc ? : boolean, gmt ? : boolean): string;
  (mask ? : string, utc ? : boolean, gmt ? : boolean): string;
  masks: DateFormatMasks;
  i18n: DateFormatI18n;
}

declare module 'dateformat' {
  declare module.exports: DateFormatStatic;
}
