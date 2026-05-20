const { withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

const SCREEN_STATE_MODULE = `package com.BookdragonDev.QuestDeck

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Build
import android.os.SystemClock
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule

class ScreenStateModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        const val NAME = "ScreenState"
    }

    // Monotonic timestamps (ms since boot) — used only for duration comparison,
    // not tied to wall-clock time so they are unaffected by clock changes or NTP.
    private var lastScreenOffAt: Long? = null
    private var lastScreenOnAt: Long? = null
    private var receiver: BroadcastReceiver? = null

    override fun getName(): String = NAME

    private fun emit(event: String) {
        if (reactContext.hasActiveReactInstance()) {
            reactContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit(event, null)
        }
    }

    @ReactMethod
    fun startObserving(promise: Promise) {
        // Reset timestamps — prevents timestamps from a previous quest session
        // from unlocking a new one.
        lastScreenOffAt = null
        lastScreenOnAt = null

        if (receiver != null) {
            promise.resolve(true)
            return
        }

        val filter = IntentFilter().apply {
            addAction(Intent.ACTION_SCREEN_OFF)
            addAction(Intent.ACTION_SCREEN_ON)
        }

        receiver = object : BroadcastReceiver() {
            override fun onReceive(context: Context, intent: Intent) {
                when (intent.action) {
                    Intent.ACTION_SCREEN_OFF -> {
                        lastScreenOffAt = SystemClock.elapsedRealtime()
                        emit("screenOff")
                    }
                    Intent.ACTION_SCREEN_ON -> {
                        lastScreenOnAt = SystemClock.elapsedRealtime()
                        emit("screenOn")
                    }
                }
            }
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            reactContext.registerReceiver(receiver, filter, Context.RECEIVER_NOT_EXPORTED)
        } else {
            @Suppress("UnspecifiedRegisterReceiverFlag")
            reactContext.registerReceiver(receiver, filter)
        }

        promise.resolve(true)
    }

    @ReactMethod
    fun stopObserving(promise: Promise) {
        receiver?.let {
            try {
                reactContext.unregisterReceiver(it)
            } catch (e: IllegalArgumentException) {
                // Already unregistered — safe to ignore
            }
            receiver = null
        }
        promise.resolve(null)
    }

    @ReactMethod
    fun getScreenStateSnapshot(promise: Promise) {
        val map = Arguments.createMap().apply {
            val off = lastScreenOffAt
            val on = lastScreenOnAt
            if (off != null) putDouble("lastScreenOffAt", off.toDouble()) else putNull("lastScreenOffAt")
            if (on != null) putDouble("lastScreenOnAt", on.toDouble()) else putNull("lastScreenOnAt")
            putBoolean("detectorAvailable", true)
        }
        promise.resolve(map)
    }

    // Required stubs for NativeEventEmitter compatibility
    @ReactMethod
    fun addListener(eventName: String) {}

    @ReactMethod
    fun removeListeners(count: Int) {}
}
`;

const SCREEN_STATE_PACKAGE = `package com.BookdragonDev.QuestDeck

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class ScreenStatePackage : ReactPackage {
    override fun createNativeModules(
        reactContext: ReactApplicationContext,
    ): List<NativeModule> = listOf(ScreenStateModule(reactContext))

    override fun createViewManagers(
        reactContext: ReactApplicationContext,
    ): List<ViewManager<*, *>> = emptyList()
}
`;

const PACKAGE_DIR = 'app/src/main/java/com/BookdragonDev/QuestDeck';
const MAIN_APP_MARKER = 'PackageList(this).packages.apply {';
const SCREEN_STATE_INJECT = 'add(ScreenStatePackage())';

module.exports = (config) =>
  withDangerousMod(config, [
    'android',
    (config) => {
      const root = config.modRequest.platformProjectRoot;
      const dir = path.join(root, PACKAGE_DIR);

      fs.writeFileSync(path.join(dir, 'ScreenStateModule.kt'), SCREEN_STATE_MODULE, 'utf8');
      fs.writeFileSync(path.join(dir, 'ScreenStatePackage.kt'), SCREEN_STATE_PACKAGE, 'utf8');

      const mainAppPath = path.join(dir, 'MainApplication.kt');
      let src = fs.readFileSync(mainAppPath, 'utf8');

      // Idempotent: only inject if not already present
      if (!src.includes(SCREEN_STATE_INJECT)) {
        src = src.replace(
          MAIN_APP_MARKER,
          `${MAIN_APP_MARKER}\n              ${SCREEN_STATE_INJECT}`,
        );
        fs.writeFileSync(mainAppPath, src, 'utf8');
      }

      return config;
    },
  ]);
