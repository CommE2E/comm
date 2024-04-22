package app.comm.android.fbjni;

import android.content.Context;
import android.util.Log;
import app.comm.android.MainApplication;
import java.io.File;
import java.lang.SecurityException;
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

  public static String getBackupDirectoryPath() {
    Context mainApplicationContext =
        MainApplication.getMainApplicationContext();
    if (mainApplicationContext == null) {
      throw new RuntimeException(
          "Failed to resolve backup path - main application context not initialized.");
    }

    String filesDirPath = mainApplicationContext.getFilesDir().getPath();
    String backupDirPath = String.join(File.separator, filesDirPath, "backup");

    try {
      File backupDirectory = new File(backupDirPath);
      if (!backupDirectory.exists() && !backupDirectory.mkdirs()) {
        throw new RuntimeException("Failed to create backup directory.");
      }
      return backupDirPath;
    } catch (SecurityException | NullPointerException e) {
      throw new RuntimeException(
          "Failed to check if backup directory exists or to attempt its creation. Details: " +
          e.getMessage());
    }
  }

  public static String
  getBackupFilePath(String backupID, boolean isAttachments) {
    String backupDirPath = PlatformSpecificTools.getBackupDirectoryPath();

    String filename;
    if (isAttachments) {
      filename = String.join("-", "backup", backupID, "attachments");
    } else {
      filename = String.join("-", "backup", backupID);
    }
    return String.join(File.separator, backupDirPath, filename);
  }

  public static String
  getBackupLogFilePath(String backupID, String logID, boolean isAttachments) {
    String backupDirPath = PlatformSpecificTools.getBackupDirectoryPath();

    String filename;
    if (isAttachments) {
      filename =
          String.join("-", "backup", backupID, "log", logID, "attachments");
    } else {
      filename = String.join("-", "backup", backupID, "log", logID);
    }
    return String.join(File.separator, backupDirPath, filename);
  }

  public static String getBackupUserKeysFilePath(String backupID) {
    String backupDirPath = PlatformSpecificTools.getBackupDirectoryPath();
    String filename = String.join("-", "backup", backupID, "userkeys");
    return String.join(File.separator, backupDirPath, filename);
  }

  public static String getSIWEBackupMessagePath(String backupID) {
    String backupDirPath = PlatformSpecificTools.getBackupDirectoryPath();
    String filename = String.join("-", "backup", backupID, "msgbackup");
    return String.join(File.separator, backupDirPath, filename);
  }

  public static void removeBackupDirectory() {
    String backupDirPath = PlatformSpecificTools.getBackupDirectoryPath();
    try {
      File backupDirectory = new File(backupDirPath);
      if (!backupDirectory.exists()) {
        return;
      }

      File[] files = backupDirectory.listFiles();
      if (files == null && !backupDirectory.delete()) {
        throw new RuntimeException("Failed to remove backup directory.");
      } else if (files == null) {
        return;
      }

      // Backup directory structure is supposed to be flat.
      for (File file : files) {
        if (!file.delete()) {
          throw new RuntimeException(
              "Failed to remove backup file at path: " + file.getPath());
        }
      }

      if (!backupDirectory.delete()) {
        throw new RuntimeException("Failed to remove backup directory.");
      }
    } catch (NullPointerException | SecurityException e) {
      throw new RuntimeException(
          "Failed to remove backup directory. Details: " + e.getMessage());
    }
  }
}
