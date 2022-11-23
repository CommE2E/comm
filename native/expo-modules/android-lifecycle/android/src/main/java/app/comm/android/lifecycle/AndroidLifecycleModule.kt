package app.comm.android.lifecycle

import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleObserver
import androidx.lifecycle.OnLifecycleEvent
import androidx.lifecycle.ProcessLifecycleOwner
import com.facebook.react.bridge.UiThreadUtil
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class AndroidLifecycleModule : Module() {
  private val lifecycleStates = mapOf(
    "ACTIVE" to "active",
    "BACKGROUND" to "background",
  )
  private val eventName = "LIFECYCLE_CHANGE"
  private val statusKey = "status"

  private val lifecycle: Lifecycle
    get() = ProcessLifecycleOwner.get().getLifecycle()

  private val observer = object : LifecycleObserver {
    @OnLifecycleEvent(Lifecycle.Event.ON_START)
    fun onStart() {
      sendEvent(
        eventName,
        mapOf(statusKey to requireNotNull(lifecycleStates["ACTIVE"]))
      )
    }

    @OnLifecycleEvent(Lifecycle.Event.ON_STOP)
    fun onStop() {
      sendEvent(
        eventName,
        mapOf(statusKey to requireNotNull(lifecycleStates["BACKGROUND"]))
      )
    }
  }

  override fun definition() = ModuleDefinition {
    Name("AndroidLifecycle")

    Constants({
      val currentState =
        if (lifecycle.getCurrentState() == Lifecycle.State.RESUMED)
          requireNotNull(lifecycleStates["ACTIVE"])
        else
          requireNotNull(lifecycleStates["BACKGROUND"])
      return@Constants lifecycleStates + ("initialStatus" to currentState)
    })

    Events(eventName)

    OnStartObserving({
      UiThreadUtil.runOnUiThread({
        lifecycle.addObserver(observer)
      })
    })

    OnStopObserving({
      UiThreadUtil.runOnUiThread({
        lifecycle.removeObserver(observer)
      })
    })
  }
}
