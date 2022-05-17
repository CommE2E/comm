package app.comm.android.fbjni;

public class MessageOperationsUtilities {
  public static native void
  storeMessageInfos(String sqliteFilePath, String rawMessageInfosString);
}
