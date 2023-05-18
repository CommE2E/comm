package app.comm.android.fbjni;

public class NotificationsCryptoModule {
  public static native int olmEncryptedTypeMessage();
  public static native String
  decrypt(String data, int messageType, String callingProcessName);
}
