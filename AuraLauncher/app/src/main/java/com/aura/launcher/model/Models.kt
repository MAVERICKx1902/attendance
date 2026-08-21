package com.aura.launcher.model

import android.content.ComponentName

/**
 * Represents a home screen item (app shortcut or folder).
 */
sealed class HomeItem {
    data class AppShortcut(
        val packageName: String,
        val activityName: String,
        val label: String,
        val icon: @androidx.annotation.DrawableRes Int? = null,
        val x: Int,
        val y: Int,
        val page: Int = 0
    ) : HomeItem() {
        val componentName: ComponentName
            get() = ComponentName(packageName, activityName)
    }

    data class Folder(
        val name: String = "",
        val items: MutableList<AppShortcut> = mutableListOf(),
        val color: Long = 0xFF1A73E8,
        val x: Int,
        val y: Int,
        val page: Int = 0
    ) : HomeItem()

    data class Widget(
        val widgetId: Int,
        val provider: ComponentName,
        val label: String,
        val x: Int,
        val y: Int,
        val spanX: Int = 4,
        val spanY: Int = 2,
        val page: Int = 0
    ) : HomeItem()
}

/**
 * Launcher configuration and preferences.
 */
data class LauncherConfig(
    val homeScreenColumns: Int = 4,
    val homeScreenRows: Int = 6,
    val drawerColumns: Int = 5,
    val iconSizeDp: Float = 56f,
    val iconLabelSizeDp: Float = 12f,
    val showIconLabels: Boolean = true,
    val blurIntensity: Float = 15f,
    val glassRefraction: Float = 0.3f,
    val glassTintColor: Long = 0x80FFFFFF,
    val dockIconCount: Int = 5,
    val showDockLabels: Boolean = true,
    val darkMode: DarkMode = DarkMode.AUTO,
    val gestureSwipeUp: GestureAction = GestureAction.APP_DRAWER,
    val gestureSwipeDown: GestureAction = GestureAction.SEARCH,
    val gestureDoubleTap: GestureAction = GestureAction.LOCK_SCREEN,
    val hiddenApps: Set<String> = emptySet(),
    val lockedApps: Set<String> = emptySet(),
    val enabledNotificationBadges: Boolean = true,
    val homeScreenPages: Int = 3,
    val defaultPage: Int = 0,
    val dockBackground: Boolean = true,
    val folderStyle: FolderStyle = FolderStyle.STOCK,
    val drawerStyle: DrawerStyle = DrawerStyle.VERTICAL_CATEGORIZED,
    val homeScreenStyle: HomeScreenStyle = HomeScreenStyle.NORMAL
)

enum class DarkMode { LIGHT, DARK, AUTO }
enum class GestureAction { NONE, APP_DRAWER, SEARCH, NOTIFICATIONS, LOCK_SCREEN, RECENT_APPS }
enum class FolderStyle { STOCK, ONE_UI }
enum class DrawerStyle { HORIZONTAL, VERTICAL, VERTICAL_CATEGORIZED }
enum class HomeScreenStyle { ALL_APPS, NORMAL }