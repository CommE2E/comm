package app.comm.android.fbjni;

public class ThreadOperations {
  public static native void updateSQLiteUnreadStatus(
      String sqliteFilePath,
      String threadID,
      boolean unread);
}
