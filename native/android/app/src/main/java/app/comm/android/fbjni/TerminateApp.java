package app.comm.android.fbjni;

public class TerminateApp {
  public static void terminate() {
    android.os.Process.killProcess(android.os.Process.myPid());
  }
}
