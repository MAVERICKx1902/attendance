package com.aura.launcher

import android.app.Application
import androidx.core.content.res.ResourcesCompat

class LauncherApp : Application() {

    override fun onCreate() {
        super.onCreate()
        instance = this
    }

    companion object {
        lateinit var instance: LauncherApp
            private set
    }
}