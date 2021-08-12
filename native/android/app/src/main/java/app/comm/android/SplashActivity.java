package app.comm.android;

import android.content.Intent;
import android.os.Bundle;
import androidx.appcompat.app.AppCompatActivity;

public class SplashActivity extends AppCompatActivity {

  @Override
  protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    forwardIntent(this.getIntent());
  }

  @Override
  public void onNewIntent(Intent intent) {
    super.onNewIntent(intent);
    setIntent(intent);
    forwardIntent(intent);
  }

  private void forwardIntent(Intent intent) {
    Intent mainIntent = new Intent(this, MainActivity.class);
    mainIntent.putExtras(intent);
    startActivity(mainIntent);
    finish();
    overridePendingTransition(0, 0);
  }
}
