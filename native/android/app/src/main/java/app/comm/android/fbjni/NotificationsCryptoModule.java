package app.comm.android.fbjni;

public class NotificationsCryptoModule {
  public static native int olmEncryptedTypeMessage();
  public static native String
  decrypt(String keyserverID, String data, int messageType);
  public static native String
  peerDecrypt(String deviceID, String data, int messageType);
}
