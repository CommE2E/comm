declare module '@fortawesome/fontawesome-common-types' {
  declare type IconDefinition = {
    icon: [
      number, // width
      number, // height
      string[], // ligatures
      string, // unicode
      string | string[] // svgPathData
    ];
   };
}
