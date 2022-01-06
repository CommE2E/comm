{ androidenv }:

androidenv.composeAndroidPackages {
  toolsVersion = "26.1.1";
  platformToolsVersion = "31.0.3";
  buildToolsVersions = [ "31.0.0" ];
  includeEmulator = false;
  emulatorVersion = "30.9.0";
  platformVersions = [ "30" ];
  includeSources = false;
  includeSystemImages = false;
  systemImageTypes = [ "google_apis_playstore" ];
  abiVersions = [ "armeabi-v7a" "arm64-v8a" ];
  cmakeVersions = [ "3.10.2" ];
  includeNDK = true;
  ndkVersions = ["22.0.7026061"];
  useGoogleAPIs = false;
  useGoogleTVAddOns = false;
  includeExtras = [
    "extras;google;gcm"
  ];
}
