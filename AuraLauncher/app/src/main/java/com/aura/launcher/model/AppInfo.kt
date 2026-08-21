package com.aura.launcher.model

import android.graphics.drawable.Drawable

/**
 * Represents an installed application on the device.
 */
data class AppInfo(
    val packageName: String,
    val activityName: String,
    val label: String,
    val icon: Drawable?,
    val category: String = "Other",
    val isSystemApp: Boolean = false,
    val installTime: Long = 0L
) {
    val componentName: String
        get() = "$packageName/$activityName"

    companion object {
        const val CATEGORY_GAMES = "Games"
        const val CATEGORY_SOCIAL = "Social"
        const val CATEGORY_TOOLS = "Tools"
        const val CATEGORY_MEDIA = "Media"
        const val CATEGORY_PRODUCTIVITY = "Productivity"
        const val CATEGORY_COMMUNICATION = "Communication"
        const val CATEGORY_SHOPPING = "Shopping"
        const val CATEGORY_OTHER = "Other"
    }
}