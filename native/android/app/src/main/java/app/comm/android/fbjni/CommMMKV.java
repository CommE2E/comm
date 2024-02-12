package app.comm.android.fbjni;

import app.comm.android.MainApplication;
import app.comm.android.fbjni.CommSecureStore;
import app.comm.android.fbjni.PlatformSpecificTools;
import com.tencent.mmkv.MMKV;
import java.util.Base64;

public class CommMMKV {
  private static final String COMM_MMKV_ID = "comm.MMKV";
  private static final int COMM_MMKV_ENCRYPTION_KEY_SIZE = 16;
  private static final String SECURE_STORE_MMKV_ENCRYPTION_KEY_ID =
      "comm.MMKVEncryptionKey";

  private static String mmkvEncryptionKey;

  private static MMKV getMMKVInstance(String mmkvID, String encryptionKey) {
    MMKV mmkv =
        MMKV.mmkvWithID(mmkvID, MMKV.SINGLE_PROCESS_MODE, encryptionKey);
    if (mmkv == null) {
      throw new RuntimeException("Failed to instantiate MMKV object.");
    }
    return mmkv;
  }

  private static void assignEncryptionKey() {
    byte[] encryptionKeyBytes = PlatformSpecificTools.generateSecureRandomBytes(
        COMM_MMKV_ENCRYPTION_KEY_SIZE);
    String encryptionKey =
        Base64.getEncoder().encodeToString(encryptionKeyBytes);
    CommSecureStore.set(SECURE_STORE_MMKV_ENCRYPTION_KEY_ID, encryptionKey);
    mmkvEncryptionKey = encryptionKey;
  }

  public static void initialize() {
    if (mmkvEncryptionKey != null) {
      return;
    }

    synchronized (CommMMKV.class) {
      if (mmkvEncryptionKey != null) {
        return;
      }

      String encryptionKey =
          CommSecureStore.get(SECURE_STORE_MMKV_ENCRYPTION_KEY_ID);

      if (encryptionKey == null) {
        assignEncryptionKey();
      } else {
        mmkvEncryptionKey = encryptionKey;
      }

      MMKV.initialize(MainApplication.getMainApplicationContext());
      getMMKVInstance(COMM_MMKV_ID, mmkvEncryptionKey);
    }
  }

  public static void clearSensitiveData() {
    initialize();
    synchronized (mmkvEncryptionKey) {
      boolean storageRemoved = MMKV.removeStorage(COMM_MMKV_ID);
      if (!storageRemoved) {
        throw new RuntimeException("Failed to remove MMKV storage.");
      }
      assignEncryptionKey();
      MMKV.initialize(MainApplication.getMainApplicationContext());
      getMMKVInstance(COMM_MMKV_ID, mmkvEncryptionKey);
    }
  }

  public static boolean setString(String key, String value) {
    initialize();
    return getMMKVInstance(COMM_MMKV_ID, mmkvEncryptionKey).encode(key, value);
  }

  public static String getString(String key) {
    initialize();
    return getMMKVInstance(COMM_MMKV_ID, mmkvEncryptionKey).decodeString(key);
  }
}