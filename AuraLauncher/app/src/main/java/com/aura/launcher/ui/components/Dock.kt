package com.aura.launcher.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.aura.launcher.model.AppInfo

/**
 * The glass dock at the bottom of the home screen.
 * Supports up to 7 icons with a frosted glass background.
 */
@Composable
fun GlassDock(
    dockApps: List<AppInfo>,
    maxIcons: Int = 5,
    showLabels: Boolean = false,
    isDark: Boolean = false,
    onAppClick: (AppInfo) -> Unit = {},
    modifier: Modifier = Modifier
) {
    val displayApps = dockApps.take(maxIcons)
    val iconSizeDp = 52.dp

    Box(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = 24.dp, vertical = 8.dp),
        contentAlignment = Alignment.Center
    ) {
        // Glass dock background
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(80.dp)
                .clip(RoundedCornerShape(32.dp))
                .background(
                    if (isDark) Color(0x2A000000)
                    else Color.White.copy(alpha = 0.12f)
                )
                .border(
                    1.dp,
                    if (isDark) Color.White.copy(alpha = 0.05f)
                    else Color.White.copy(alpha = 0.15f),
                    RoundedCornerShape(32.dp)
                ),
            contentAlignment = Alignment.Center
        ) {
            // Subtle gradient for glass depth
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(80.dp)
                    .clip(RoundedCornerShape(32.dp))
                    .background(
                        Brush.verticalGradient(
                            0f to Color.Transparent,
                            0.5f to Color.White.copy(alpha = 0.05f),
                            1f to Color.Black.copy(alpha = 0.03f)
                        )
                    )
            )

            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp),
                horizontalArrangement = Arrangement.SpaceEvenly,
                verticalAlignment = Alignment.CenterVertically
            ) {
                displayApps.forEach { app ->
                    GlassAppIcon(
                        icon = app.icon,
                        label = app.label,
                        showLabel = showLabels,
                        iconSize = iconSizeDp,
                        labelSize = 11,
                        isDark = isDark,
                        onClick = { onAppClick(app) }
                    )
                }
            }
        }
    }
}