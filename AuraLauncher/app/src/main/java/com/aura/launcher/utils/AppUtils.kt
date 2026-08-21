package com.aura.launcher.utils

import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.content.pm.ResolveInfo
import android.graphics.drawable.Drawable
import com.aura.launcher.model.AppInfo
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

object AppUtils {

    /**
     * Retrieves all installed launchable applications.
     */
    suspend fun getInstalledApps(context: Context): List<AppInfo> = withContext(Dispatchers.IO) {
        val pm = context.packageManager
        val mainIntent = Intent(Intent.ACTION_MAIN, null).apply {
            addCategory(Intent.CATEGORY_LAUNCHER)
        }
        val resolveInfos = pm.queryIntentActivities(mainIntent, 0)
        val apps = resolveInfos.mapNotNull { resolveInfo ->
            resolveInfo.toAppInfo(pm)
        }
        apps.sortedBy { it.label.lowercase() }
    }

    /**
     * Categorizes an app based on its package name or installer.
     */
    fun categorizeApp(app: AppInfo): String {
        val packageName = app.packageName.lowercase()
        val label = app.label.lowercase()

        return when {
            packageName.contains("game") || packageName.contains("gacha") ||
                    label.contains("game") || label.contains("play") -> AppInfo.CATEGORY_GAMES

            packageName.contains("facebook") || packageName.contains("instagram") ||
                    packageName.contains("twitter") || packageName.contains("tiktok") ||
                    packageName.contains("snapchat") || packageName.contains("linkedin") ||
                    packageName.contains("reddit") || packageName.contains("pinterest") ||
                    label.contains("social") -> AppInfo.CATEGORY_SOCIAL

            packageName.contains("chrome") || packageName.contains("browser") ||
                    packageName.contains("settings") || packageName.contains("file") ||
                    packageName.contains("calculator") || packageName.contains("clock") ||
                    packageName.contains("calendar") || packageName.contains("notes") ||
                    label.contains("tool") || label.contains("utility") -> AppInfo.CATEGORY_TOOLS

            packageName.contains("youtube") || packageName.contains("music") ||
                    packageName.contains("video") || packageName.contains("player") ||
                    packageName.contains("gallery") || packageName.contains("photo") ||
                    packageName.contains("camera") || packageName.contains("netflix") ||
                    packageName.contains("spotify") || label.contains("media") ||
                    label.contains("music") || label.contains("video") -> AppInfo.CATEGORY_MEDIA

            packageName.contains("doc") || packageName.contains("sheet") ||
                    packageName.contains("slide") || packageName.contains("drive") ||
                    packageName.contains("office") || packageName.contains("word") ||
                    packageName.contains("excel") || packageName.contains("pdf") ||
                    label.contains("office") || label.contains("document") ||
                    label.contains("productivity") -> AppInfo.CATEGORY_PRODUCTIVITY

            packageName.contains("whatsapp") || packageName.contains("telegram") ||
                    packageName.contains("signal") || packageName.contains("messenger") ||
                    packageName.contains("message") || packageName.contains("discord") ||
                    packageName.contains("slack") || packageName.contains("zoom") ||
                    packageName.contains("meet") || packageName.contains("teams") ||
                    label.contains("chat") || label.contains("message") ||
                    label.contains("communication") -> AppInfo.CATEGORY_COMMUNICATION

            packageName.contains("shop") || packageName.contains("amazon") ||
                    packageName.contains("flipkart") || packageName.contains("ebay") ||
                    packageName.contains("aliexpress") || packageName.contains("walmart") ||
                    label.contains("shop") || label.contains("mall") ||
                    label.contains("shopping") -> AppInfo.CATEGORY_SHOPPING

            else -> AppInfo.CATEGORY_OTHER
        }
    }

    private fun ResolveInfo.toAppInfo(pm: PackageManager): AppInfo? {
        try {
            val activityInfo = activityInfo ?: return null
            val packageName = activityInfo.packageName
            val icon: Drawable? = try {
                loadIcon(pm)
            } catch (e: Exception) {
                null
            }
            val label = loadLabel(pm).toString()
            val isSystem = try {
                (pm.getApplicationInfo(packageName, 0).flags and
                        android.content.pm.ApplicationInfo.FLAG_SYSTEM) != 0
            } catch (e: Exception) {
                false
            }

            return AppInfo(
                packageName = packageName,
                activityName = activityInfo.name,
                label = label,
                icon = icon,
                category = categorizeApp(
                    AppInfo(packageName, activityInfo.name, label, null)
                ),
                isSystemApp = isSystem,
                installTime = try {
                    pm.getPackageInfo(packageName, 0).firstInstallTime
                } catch (e: Exception) {
                    0L
                }
            )
        } catch (e: Exception) {
            return null
        }
    }

    /**
     * Launches an app by its package and activity name.
     */
    fun launchApp(context: Context, packageName: String, activityName: String) {
        try {
            val intent = Intent(Intent.ACTION_MAIN).apply {
                addCategory(Intent.CATEGORY_LAUNCHER)
                setClassName(packageName, activityName)
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or
                        Intent.FLAG_ACTIVITY_RESET_TASK_IF_NEEDED
            }
            context.startActivity(intent)
        } catch (e: Exception) {
            // App may have been uninstalled
        }
    }

    /**
     * Opens app settings for a given package.
     */
    fun openAppSettings(context: Context, packageName: String) {
        try {
            val intent = Intent(android.provider.Settings.ACTION_APPLICATION_DETAILS_SETTINGS)
            intent.data = android.net.Uri.parse("package:$packageName")
            intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK
            context.startActivity(intent)
        } catch (e: Exception) {
            // Settings may not be available
        }
    }
}