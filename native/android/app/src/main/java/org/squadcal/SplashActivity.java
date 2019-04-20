package org.squadcal;

import android.content.Intent;
import android.os.Bundle;
import android.support.v7.app.AppCompatActivity;

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
    finish();
    startActivity(mainIntent);
  }

}
