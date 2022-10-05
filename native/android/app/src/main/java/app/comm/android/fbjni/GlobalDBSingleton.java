package app.comm.android.fbjni;

public class GlobalDBSingleton {
  public static native void scheduleOrRun(Runnable task);
  public static native void enableMultithreading();
}
