package app.comm.android.lifecycle

import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleObserver
import androidx.lifecycle.OnLifecycleEvent
import androidx.lifecycle.ProcessLifecycleOwner
import com.facebook.react.bridge.UiThreadUtil
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

private const val moduleName = "AndroidLifecycle"
private const val eventName = "LIFECYCLE_CHANGE"
private const val statusKey = "status"

private enum class LifecycleState(val jsName: String) {
  ACTIVE("active"),
  BACKGROUND("background");

  companion object {
    val constantsMap
      get() = LifecycleState.values().associate { it.name to it.jsName }
  }
}

class AndroidLifecycleModule : Module() {
  override fun definition() = ModuleDefinition {
    Name(moduleName)

    Constants {
      val currentState =
        if (lifecycle.getCurrentState() == Lifecycle.State.RESUMED)
          LifecycleState.ACTIVE
        else
          LifecycleState.BACKGROUND
      return@Constants LifecycleState.constantsMap +
        ("initialStatus" to currentState.jsName)
    }

    Events(eventName)

    OnStartObserving {
      UiThreadUtil.runOnUiThread {
        lifecycle.addObserver(observer)
      }
    }

    OnStopObserving {
      UiThreadUtil.runOnUiThread {
        lifecycle.removeObserver(observer)
      }
    }
  }

  private val lifecycle: Lifecycle
    get() = ProcessLifecycleOwner.get().getLifecycle()

  private val observer = object : LifecycleObserver {
    @OnLifecycleEvent(Lifecycle.Event.ON_START)
    fun onStart() {
      sendEvent(
        eventName,
        mapOf(statusKey to LifecycleState.ACTIVE.jsName)
      )
    }

    @OnLifecycleEvent(Lifecycle.Event.ON_STOP)
    fun onStop() {
      sendEvent(
        eventName,
        mapOf(statusKey to LifecycleState.BACKGROUND.jsName)
      )
    }
  }
}
