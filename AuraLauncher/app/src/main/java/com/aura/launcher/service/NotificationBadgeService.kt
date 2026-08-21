package com.aura.launcher.service

import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification

/**
 * Notification listener service for badge counts on app icons.
 */
class NotificationBadgeService : NotificationListenerService() {

    private val badgeCounts = mutableMapOf<String, Int>()

    override fun onNotificationPosted(sbn: StatusBarNotification) {
        val packageName = sbn.packageName
        if (sbn.isClearable) {
            badgeCounts[packageName] = (badgeCounts[packageName] ?: 0) + 1
        }
        broadcastBadgeUpdate()
    }

    override fun onNotificationRemoved(sbn: StatusBarNotification) {
        val packageName = sbn.packageName
        badgeCounts[packageName] = (badgeCounts[packageName] ?: 1) - 1
        if (badgeCounts[packageName]!! <= 0) {
            badgeCounts.remove(packageName)
        }
        broadcastBadgeUpdate()
    }

    override fun onListenerConnected() {
        super.onListenerConnected()
        // Rebuild badge counts from active notifications
        badgeCounts.clear()
        val activeNotifications = activeNotifications
        for (sbn in activeNotifications) {
            if (sbn.isClearable) {
                val pkg = sbn.packageName
                badgeCounts[pkg] = (badgeCounts[pkg] ?: 0) + 1
            }
        }
        broadcastBadgeUpdate()
    }

    private fun broadcastBadgeUpdate() {
        // Send broadcast or update local state for the launcher
        val intent = android.content.Intent("com.aura.launcher.BADGE_UPDATE")
        intent.putExtra(
            "badge_data",
            java.util.HashMap(badgeCounts)
        )
        sendBroadcast(intent)
    }

    companion object {
        fun getBadgeCount(badgeData: MutableMap<String, Int>?, packageName: String): Int {
            return badgeData?.get(packageName) ?: 0
        }
    }
}