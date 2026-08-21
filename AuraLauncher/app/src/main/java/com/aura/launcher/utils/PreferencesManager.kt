package com.aura.launcher.utils

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.floatPreferencesKey
import androidx.datastore.preferences.core.intPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.core.stringSetPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.aura.launcher.model.DarkMode
import com.aura.launcher.model.DrawerStyle
import com.aura.launcher.model.FolderStyle
import com.aura.launcher.model.GestureAction
import com.aura.launcher.model.HomeScreenStyle
import com.aura.launcher.model.LauncherConfig
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map

private val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "aura_launcher_prefs")

class PreferencesManager(private val context: Context) {

    // Keys
    private object Keys {
        val HOME_SCREEN_COLUMNS = intPreferencesKey("home_screen_columns")
        val HOME_SCREEN_ROWS = intPreferencesKey("home_screen_rows")
        val DRAWER_COLUMNS = intPreferencesKey("drawer_columns")
        val ICON_SIZE = floatPreferencesKey("icon_size")
        val ICON_LABEL_SIZE = floatPreferencesKey("icon_label_size")
        val SHOW_ICON_LABELS = booleanPreferencesKey("show_icon_labels")
        val BLUR_INTENSITY = floatPreferencesKey("blur_intensity")
        val GLASS_REFRACTION = floatPreferencesKey("glass_refraction")
        val GLASS_TINT = floatPreferencesKey("glass_tint")
        val DOCK_ICON_COUNT = intPreferencesKey("dock_icon_count")
        val SHOW_DOCK_LABELS = booleanPreferencesKey("show_dock_labels")
        val DARK_MODE = stringPreferencesKey("dark_mode")
        val GESTURE_SWIPE_UP = stringPreferencesKey("gesture_swipe_up")
        val GESTURE_SWIPE_DOWN = stringPreferencesKey("gesture_swipe_down")
        val GESTURE_DOUBLE_TAP = stringPreferencesKey("gesture_double_tap")
        val HIDDEN_APPS = stringSetPreferencesKey("hidden_apps")
        val LOCKED_APPS = stringSetPreferencesKey("locked_apps")
        val ENABLED_BADGES = booleanPreferencesKey("enabled_badges")
        val HOME_PAGES = intPreferencesKey("home_pages")
        val DEFAULT_PAGE = intPreferencesKey("default_page")
        val DOCK_BACKGROUND = booleanPreferencesKey("dock_background")
        val FOLDER_STYLE = stringPreferencesKey("folder_style")
        val DRAWER_STYLE = stringPreferencesKey("drawer_style")
        val HOME_STYLE = stringPreferencesKey("home_style")
        val FIRST_LAUNCH = booleanPreferencesKey("first_launch")
        val DOCK_APPS = stringPreferencesKey("dock_apps")
        val HOME_LAYOUT = stringPreferencesKey("home_layout")
    }

    val config: Flow<LauncherConfig> = context.dataStore.data.map { prefs ->
        LauncherConfig(
            homeScreenColumns = prefs[Keys.HOME_SCREEN_COLUMNS] ?: 4,
            homeScreenRows = prefs[Keys.HOME_SCREEN_ROWS] ?: 6,
            drawerColumns = prefs[Keys.DRAWER_COLUMNS] ?: 5,
            iconSizeDp = prefs[Keys.ICON_SIZE] ?: 56f,
            iconLabelSizeDp = prefs[Keys.ICON_LABEL_SIZE] ?: 12f,
            showIconLabels = prefs[Keys.SHOW_ICON_LABELS] ?: true,
            blurIntensity = prefs[Keys.BLUR_INTENSITY] ?: 15f,
            glassRefraction = prefs[Keys.GLASS_REFRACTION] ?: 0.3f,
            glassTintColor = (prefs[Keys.GLASS_TINT]?.toLong() ?: 0x80FFFFFFL),
            dockIconCount = prefs[Keys.DOCK_ICON_COUNT] ?: 5,
            showDockLabels = prefs[Keys.SHOW_DOCK_LABELS] ?: true,
            darkMode = enumFromPref(prefs[Keys.DARK_MODE], DarkMode.AUTO),
            gestureSwipeUp = enumFromPref(prefs[Keys.GESTURE_SWIPE_UP], GestureAction.APP_DRAWER),
            gestureSwipeDown = enumFromPref(prefs[Keys.GESTURE_SWIPE_DOWN], GestureAction.SEARCH),
            gestureDoubleTap = enumFromPref(prefs[Keys.GESTURE_DOUBLE_TAP], GestureAction.LOCK_SCREEN),
            hiddenApps = prefs[Keys.HIDDEN_APPS] ?: emptySet(),
            lockedApps = prefs[Keys.LOCKED_APPS] ?: emptySet(),
            enabledNotificationBadges = prefs[Keys.ENABLED_BADGES] ?: true,
            homeScreenPages = prefs[Keys.HOME_PAGES] ?: 3,
            defaultPage = prefs[Keys.DEFAULT_PAGE] ?: 0,
            dockBackground = prefs[Keys.DOCK_BACKGROUND] ?: true,
            folderStyle = enumFromPref(prefs[Keys.FOLDER_STYLE], FolderStyle.STOCK),
            drawerStyle = enumFromPref(prefs[Keys.DRAWER_STYLE], DrawerStyle.VERTICAL_CATEGORIZED),
            homeScreenStyle = enumFromPref(prefs[Keys.HOME_STYLE], HomeScreenStyle.NORMAL)
        )
    }

    private fun <T : Enum<T>> enumFromPref(value: String?, default: T): T {
        if (value == null) return default
        return try {
            java.lang.Enum.valueOf(default::class.java, value)
        } catch (e: Exception) {
            default
        }
    }

    suspend fun updateConfig(update: LauncherConfig.() -> LauncherConfig) {
        val current = config.first()
        val updated = current.update()
        saveConfig(updated)
    }

    suspend fun saveConfig(config: LauncherConfig) {
        context.dataStore.edit { prefs ->
            prefs[Keys.HOME_SCREEN_COLUMNS] = config.homeScreenColumns
            prefs[Keys.HOME_SCREEN_ROWS] = config.homeScreenRows
            prefs[Keys.DRAWER_COLUMNS] = config.drawerColumns
            prefs[Keys.ICON_SIZE] = config.iconSizeDp
            prefs[Keys.ICON_LABEL_SIZE] = config.iconLabelSizeDp
            prefs[Keys.SHOW_ICON_LABELS] = config.showIconLabels
            prefs[Keys.BLUR_INTENSITY] = config.blurIntensity
            prefs[Keys.GLASS_REFRACTION] = config.glassRefraction
            prefs[Keys.GLASS_TINT] = config.glassTintColor.toFloat()
            prefs[Keys.DOCK_ICON_COUNT] = config.dockIconCount
            prefs[Keys.SHOW_DOCK_LABELS] = config.showDockLabels
            prefs[Keys.DARK_MODE] = config.darkMode.name
            prefs[Keys.GESTURE_SWIPE_UP] = config.gestureSwipeUp.name
            prefs[Keys.GESTURE_SWIPE_DOWN] = config.gestureSwipeDown.name
            prefs[Keys.GESTURE_DOUBLE_TAP] = config.gestureDoubleTap.name
            prefs[Keys.HIDDEN_APPS] = config.hiddenApps
            prefs[Keys.LOCKED_APPS] = config.lockedApps
            prefs[Keys.ENABLED_BADGES] = config.enabledNotificationBadges
            prefs[Keys.HOME_PAGES] = config.homeScreenPages
            prefs[Keys.DEFAULT_PAGE] = config.defaultPage
            prefs[Keys.DOCK_BACKGROUND] = config.dockBackground
            prefs[Keys.FOLDER_STYLE] = config.folderStyle.name
            prefs[Keys.DRAWER_STYLE] = config.drawerStyle.name
            prefs[Keys.HOME_STYLE] = config.homeScreenStyle.name
        }
    }

    // Dock apps
    suspend fun getDockApps(): List<String> {
        return context.dataStore.data.first()[Keys.DOCK_APPS]
            ?.split(",")
            ?.filter { it.isNotBlank() }
            ?: listOf(
                "com.android.chrome",
                "com.google.android.apps.messaging",
                "com.whatsapp",
                "com.spotify.music",
                "com.google.android.youtube"
            )
    }

    suspend fun saveDockApps(apps: List<String>) {
        context.dataStore.edit { prefs ->
            prefs[Keys.DOCK_APPS] = apps.joinToString(",")
        }
    }

    // Home layout persistence
    suspend fun getHomeLayout(): String {
        return context.dataStore.data.first()[Keys.HOME_LAYOUT] ?: "[]"
    }

    suspend fun saveHomeLayout(json: String) {
        context.dataStore.edit { prefs ->
            prefs[Keys.HOME_LAYOUT] = json
        }
    }

    // First launch
    suspend fun isFirstLaunch(): Boolean {
        return context.dataStore.data.first()[Keys.FIRST_LAUNCH] ?: true
    }

    suspend fun setFirstLaunchComplete() {
        context.dataStore.edit { prefs ->
            prefs[Keys.FIRST_LAUNCH] = false
        }
    }
}