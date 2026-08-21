package com.aura.launcher.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Brightness6
import androidx.compose.material.icons.filled.Brush
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.DarkMode
import androidx.compose.material.icons.filled.Folder
import androidx.compose.material.icons.filled.Gesture
import androidx.compose.material.icons.filled.GridView
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.VisibilityOff
import androidx.compose.material.icons.filled.Wallpaper
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExposedDropdownMenuBox
import androidx.compose.material3.ExposedDropdownMenuDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Slider
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.aura.launcher.model.DarkMode
import com.aura.launcher.model.DrawerStyle
import com.aura.launcher.model.FolderStyle
import com.aura.launcher.model.GestureAction
import com.aura.launcher.model.HomeScreenStyle
import com.aura.launcher.model.LauncherConfig

/**
 * Settings screen for customizing the launcher.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(
    config: LauncherConfig,
    isDark: Boolean,
    onConfigChange: (LauncherConfig) -> Unit,
    onDismiss: () -> Unit,
    modifier: Modifier = Modifier
) {
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
        containerColor = if (isDark) Color(0xFF1E1E1E) else Color(0xFFF8F9FA),
        modifier = modifier
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 24.dp)
                .padding(bottom = 32.dp)
        ) {
            // Header
            Text(
                text = "Launcher Settings",
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.SemiBold,
                modifier = Modifier.padding(bottom = 16.dp)
            )

            HorizontalDivider()

            LazyColumn(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(500.dp),
                verticalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                // Theme section
                item { SectionHeader("Appearance") }

                item {
                    SettingRow(
                        icon = Icons.Default.Brightness6,
                        title = "Dark Mode",
                        control = {
                            var expanded by remember { mutableStateOf(false) }
                            ExposedDropdownMenuBox(
                                expanded = expanded,
                                onExpandedChange = { expanded = !expanded }
                            ) {
                                OutlinedTextField(
                                    value = when (config.darkMode) {
                                        DarkMode.LIGHT -> "Light"
                                        DarkMode.DARK -> "Dark"
                                        DarkMode.AUTO -> "Auto"
                                    },
                                    onValueChange = {},
                                    readOnly = true,
                                    trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded) },
                                    modifier = Modifier.menuAnchor().width(120.dp),
                                    textStyle = MaterialTheme.typography.bodySmall
                                )
                                ExposedDropdownMenu(
                                    expanded = expanded,
                                    onDismissRequest = { expanded = false }
                                ) {
                                    DropdownMenuItem(
                                        text = { Text("Light") },
                                        onClick = {
                                            onConfigChange(config.copy(darkMode = DarkMode.LIGHT))
                                            expanded = false
                                        }
                                    )
                                    DropdownMenuItem(
                                        text = { Text("Dark") },
                                        onClick = {
                                            onConfigChange(config.copy(darkMode = DarkMode.DARK))
                                            expanded = false
                                        }
                                    )
                                    DropdownMenuItem(
                                        text = { Text("Auto") },
                                        onClick = {
                                            onConfigChange(config.copy(darkMode = DarkMode.AUTO))
                                            expanded = false
                                        }
                                    )
                                }
                            }
                        }
                    )
                }

                // Glass effects
                item { SectionHeader("Glass Effect") }

                item {
                    SettingSlider(
                        icon = Icons.Default.Brush,
                        title = "Blur Intensity",
                        value = config.blurIntensity,
                        range = 0f..30f,
                        onValueChange = { onConfigChange(config.copy(blurIntensity = it)) }
                    )
                }

                item {
                    SettingSlider(
                        icon = null,
                        title = "Glass Refraction",
                        value = config.glassRefraction * 100f,
                        range = 0f..100f,
                        onValueChange = { onConfigChange(config.copy(glassRefraction = it / 100f)) }
                    )
                }

                // Home screen
                item { SectionHeader("Home Screen") }

                item {
                    SettingRow(
                        icon = Icons.Default.GridView,
                        title = "Columns",
                        control = {
                            var expanded by remember { mutableStateOf(false) }
                            ExposedDropdownMenuBox(
                                expanded = expanded,
                                onExpandedChange = { expanded = !expanded }
                            ) {
                                OutlinedTextField(
                                    value = "${config.homeScreenColumns}",
                                    onValueChange = {},
                                    readOnly = true,
                                    trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded) },
                                    modifier = Modifier.menuAnchor().width(90.dp),
                                    textStyle = MaterialTheme.typography.bodySmall
                                )
                                ExposedDropdownMenu(
                                    expanded = expanded,
                                    onDismissRequest = { expanded = false }
                                ) {
                                    listOf(3, 4, 5, 6).forEach { cols ->
                                        DropdownMenuItem(
                                            text = { Text("$cols") },
                                            onClick = {
                                                onConfigChange(config.copy(homeScreenColumns = cols))
                                                expanded = false
                                            }
                                        )
                                    }
                                }
                            }
                        }
                    )
                }

                item {
                    SettingSlider(
                        icon = null,
                        title = "Icon Size",
                        value = config.iconSizeDp,
                        range = 40f..80f,
                        onValueChange = { onConfigChange(config.copy(iconSizeDp = it)) }
                    )
                }

                item {
                    SettingSwitch(
                        icon = null,
                        title = "Show Icon Labels",
                        checked = config.showIconLabels,
                        onCheckedChange = { onConfigChange(config.copy(showIconLabels = it)) }
                    )
                }

                item {
                    SettingRow(
                        icon = Icons.Default.Home,
                        title = "Home Screen Style",
                        control = {
                            var expanded by remember { mutableStateOf(false) }
                            ExposedDropdownMenuBox(
                                expanded = expanded,
                                onExpandedChange = { expanded = !expanded }
                            ) {
                                OutlinedTextField(
                                    value = when (config.homeScreenStyle) {
                                        HomeScreenStyle.NORMAL -> "Normal"
                                        HomeScreenStyle.ALL_APPS -> "All Apps"
                                    },
                                    onValueChange = {},
                                    readOnly = true,
                                    trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded) },
                                    modifier = Modifier.menuAnchor().width(120.dp),
                                    textStyle = MaterialTheme.typography.bodySmall
                                )
                                ExposedDropdownMenu(
                                    expanded = expanded,
                                    onDismissRequest = { expanded = false }
                                ) {
                                    HomeScreenStyle.entries.forEach { style ->
                                        DropdownMenuItem(
                                            text = { Text(style.name.replace("_", " ")) },
                                            onClick = {
                                                onConfigChange(config.copy(homeScreenStyle = style))
                                                expanded = false
                                            }
                                        )
                                    }
                                }
                            }
                        }
                    )
                }

                // Dock
                item { SectionHeader("Dock") }

                item {
                    SettingSwitch(
                        icon = null,
                        title = "Show Dock Background",
                        checked = config.dockBackground,
                        onCheckedChange = { onConfigChange(config.copy(dockBackground = it)) }
                    )
                }

                item {
                    SettingSwitch(
                        icon = null,
                        title = "Show Dock Labels",
                        checked = config.showDockLabels,
                        onCheckedChange = { onConfigChange(config.copy(showDockLabels = it)) }
                    )
                }

                // Drawer
                item { SectionHeader("App Drawer") }

                item {
                    SettingRow(
                        icon = Icons.Default.GridView,
                        title = "Drawer Style",
                        control = {
                            var expanded by remember { mutableStateOf(false) }
                            ExposedDropdownMenuBox(
                                expanded = expanded,
                                onExpandedChange = { expanded = !expanded }
                            ) {
                                OutlinedTextField(
                                    value = when (config.drawerStyle) {
                                        DrawerStyle.HORIZONTAL -> "Horizontal"
                                        DrawerStyle.VERTICAL -> "Vertical"
                                        DrawerStyle.VERTICAL_CATEGORIZED -> "Categorized"
                                    },
                                    onValueChange = {},
                                    readOnly = true,
                                    trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded) },
                                    modifier = Modifier.menuAnchor().width(140.dp),
                                    textStyle = MaterialTheme.typography.bodySmall
                                )
                                ExposedDropdownMenu(
                                    expanded = expanded,
                                    onDismissRequest = { expanded = false }
                                ) {
                                    DrawerStyle.entries.forEach { style ->
                                        DropdownMenuItem(
                                            text = { Text(style.name.replace("_", " ")) },
                                            onClick = {
                                                onConfigChange(config.copy(drawerStyle = style))
                                                expanded = false
                                            }
                                        )
                                    }
                                }
                            }
                        }
                    )
                }

                // Gestures
                item { SectionHeader("Gestures") }

                item {
                    GestureSetting(
                        title = "Swipe Up",
                        currentAction = config.gestureSwipeUp,
                        onActionChange = { onConfigChange(config.copy(gestureSwipeUp = it)) }
                    )
                }

                item {
                    GestureSetting(
                        title = "Swipe Down",
                        currentAction = config.gestureSwipeDown,
                        onActionChange = { onConfigChange(config.copy(gestureSwipeDown = it)) }
                    )
                }

                item {
                    GestureSetting(
                        title = "Double Tap",
                        currentAction = config.gestureDoubleTap,
                        onActionChange = { onConfigChange(config.copy(gestureDoubleTap = it)) }
                    )
                }

                // Folders
                item { SectionHeader("Folders") }

                item {
                    SettingRow(
                        icon = Icons.Default.Folder,
                        title = "Folder Style",
                        control = {
                            var expanded by remember { mutableStateOf(false) }
                            ExposedDropdownMenuBox(
                                expanded = expanded,
                                onExpandedChange = { expanded = !expanded }
                            ) {
                                OutlinedTextField(
                                    value = when (config.folderStyle) {
                                        FolderStyle.STOCK -> "Stock"
                                        FolderStyle.ONE_UI -> "One UI"
                                    },
                                    onValueChange = {},
                                    readOnly = true,
                                    trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded) },
                                    modifier = Modifier.menuAnchor().width(120.dp),
                                    textStyle = MaterialTheme.typography.bodySmall
                                )
                                ExposedDropdownMenu(
                                    expanded = expanded,
                                    onDismissRequest = { expanded = false }
                                ) {
                                    FolderStyle.entries.forEach { style ->
                                        DropdownMenuItem(
                                            text = { Text(style.name.replace("_", " ")) },
                                            onClick = {
                                                onConfigChange(config.copy(folderStyle = style))
                                                expanded = false
                                            }
                                        )
                                    }
                                }
                            }
                        }
                    )
                }

                // Privacy
                item { SectionHeader("Privacy") }

                item {
                    SettingSwitch(
                        icon = Icons.Default.VisibilityOff,
                        title = "Enable Notification Badges",
                        checked = config.enabledNotificationBadges,
                        onCheckedChange = { onConfigChange(config.copy(enabledNotificationBadges = it)) }
                    )
                }

                item {
                    SettingRow(
                        icon = Icons.Default.Lock,
                        title = "Lock & Hide Apps",
                        control = {
                            OutlinedButton(
                                onClick = { /* TODO: Show hidden/locked apps dialog */ },
                                modifier = Modifier.height(36.dp)
                            ) {
                                Text("Manage", fontSize = 12.sp)
                            }
                        }
                    )
                }

                item { Spacer(modifier = Modifier.height(16.dp)) }
            }
        }
    }
}

@Composable
fun SectionHeader(title: String) {
    Text(
        text = title,
        style = MaterialTheme.typography.titleSmall,
        fontWeight = FontWeight.SemiBold,
        color = MaterialTheme.colorScheme.primary,
        modifier = Modifier.padding(top = 16.dp, bottom = 4.dp)
    )
}

@Composable
fun SettingRow(
    icon: ImageVector?,
    title: String,
    control: @Composable () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 6.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        if (icon != null) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
                modifier = Modifier.size(20.dp)
            )
            Spacer(modifier = Modifier.width(12.dp))
        } else {
            Spacer(modifier = Modifier.width(32.dp))
        }
        Text(
            text = title,
            style = MaterialTheme.typography.bodyMedium,
            modifier = Modifier.weight(1f)
        )
        control()
    }
}

@Composable
fun SettingSlider(
    icon: ImageVector?,
    title: String,
    value: Float,
    range: ClosedFloatingPointRange<Float>,
    onValueChange: (Float) -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            if (icon != null) {
                Icon(
                    imageVector = icon,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
                    modifier = Modifier.size(20.dp)
                )
                Spacer(modifier = Modifier.width(12.dp))
            } else {
                Spacer(modifier = Modifier.width(32.dp))
            }
            Text(
                text = title,
                style = MaterialTheme.typography.bodyMedium,
                modifier = Modifier.weight(1f)
            )
            Text(
                text = "${value.toInt()}",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
            )
        }
        Slider(
            value = value,
            onValueChange = onValueChange,
            valueRange = range,
            modifier = Modifier.padding(start = if (icon != null) 32.dp else 0.dp)
        )
    }
}

@Composable
fun SettingSwitch(
    icon: ImageVector?,
    title: String,
    checked: Boolean,
    onCheckedChange: (Boolean) -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 6.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        if (icon != null) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
                modifier = Modifier.size(20.dp)
            )
            Spacer(modifier = Modifier.width(12.dp))
        } else {
            Spacer(modifier = Modifier.width(32.dp))
        }
        Text(
            text = title,
            style = MaterialTheme.typography.bodyMedium,
            modifier = Modifier.weight(1f)
        )
        Switch(
            checked = checked,
            onCheckedChange = onCheckedChange
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun GestureSetting(
    title: String,
    currentAction: GestureAction,
    onActionChange: (GestureAction) -> Unit
) {
    var expanded by remember { mutableStateOf(false) }

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 6.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(
            imageVector = Icons.Default.Gesture,
            contentDescription = null,
            tint = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
            modifier = Modifier.size(20.dp)
        )
        Spacer(modifier = Modifier.width(12.dp))
        Text(
            text = title,
            style = MaterialTheme.typography.bodyMedium,
            modifier = Modifier.weight(1f)
        )

        ExposedDropdownMenuBox(
            expanded = expanded,
            onExpandedChange = { expanded = !expanded }
        ) {
            OutlinedTextField(
                value = currentAction.name.replace("_", " "),
                onValueChange = {},
                readOnly = true,
                trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded) },
                modifier = Modifier.menuAnchor().width(140.dp),
                textStyle = MaterialTheme.typography.bodySmall
            )
            ExposedDropdownMenu(
                expanded = expanded,
                onDismissRequest = { expanded = false }
            ) {
                GestureAction.entries.filter { it != GestureAction.NONE || title == "Double Tap" }
                    .forEach { action ->
                        DropdownMenuItem(
                            text = { Text(action.name.replace("_", " ")) },
                            onClick = {
                                onActionChange(action)
                                expanded = false
                            }
                        )
                    }
            }
        }
    }
}