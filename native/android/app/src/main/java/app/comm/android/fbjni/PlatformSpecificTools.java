package app.comm.android.fbjni;

import android.content.Context;
import android.util.Log;
import app.comm.android.MainApplication;
import java.io.File;
import java.nio.charset.StandardCharsets;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;

public class PlatformSpecificTools {
  static SecureRandom secureRandom = new SecureRandom();

  public static byte[] generateSecureRandomBytes(int size) {
    byte[] buffer = new byte[size];
    secureRandom.nextBytes(buffer);
    return buffer;
  }

  public static String getNotificationsCryptoAccountPath() {
    Context mainApplicationContext =
        MainApplication.getMainApplicationContext();
    if (mainApplicationContext == null) {
      throw new RuntimeException(
          "Failed to resolve notifications crypto account path - main application context not initialized.");
    }
    return mainApplicationContext
        .getFileStreamPath("comm_notifications_crypto_account")
        .getPath();
  }

  private static String getBackupDirectoryPath() {
    Context mainApplicationContext =
        MainApplication.getMainApplicationContext();
    if (mainApplicationContext == null) {
      throw new RuntimeException(
          "Failed to resolve backup path - main application context not initialized.");
    }

    String filesDirPath = mainApplicationContext.getFilesDir().getPath();
    String backupDirPath = String.join(File.separator, filesDirPath, "backup");
    return backupDirPath;
  }

  public static String
  getBackupFilePath(String backupID, boolean isAttachments) {
    String backupDirPath = PlatformSpecificTools.getBackupDirectoryPath();

    try {
      File backupDirectory = new File(backupDirPath);
      if (!backupDirectory.exists()) {
        backupDirectory.mkdirs();
      }
    } catch (Exception e) {
      throw new RuntimeException(
          "Failed to create backup directory. Details: " + e.getMessage());
    }

    if (isAttachments) {
      return String.join(
          File.separator, backupDirPath, "backup-id-attachments-" + backupID);
    }
    return String.join(File.separator, backupDirPath, "backup-id-" + backupID);
  }

  public static void removeBackupDirectory() {
    String backupDirPath = PlatformSpecificTools.getBackupDirectoryPath();
    try {
      File backupDirectory = new File(backupDirPath);
      if (!backupDirectory.exists()) {
        return;
      }

      File[] files = backupDirectory.listFiles();
      if (files == null) {
        backupDirectory.delete();
        return;
      }

      // Backup directory structure is supposed to be flat.
      for (File file : files) {
        file.delete();
      }
      backupDirectory.delete();
    } catch (Exception e) {
      throw new RuntimeException(
          "Failed to remove backup directory. Details: " + e.getMessage());
    }
  }
}
