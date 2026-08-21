package com.aura.launcher.ui.theme

import android.app.Activity
import android.os.Build
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.dynamicDarkColorScheme
import androidx.compose.material3.dynamicLightColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat
import com.aura.launcher.model.DarkMode

private val LightColorScheme = lightColorScheme(
    primary = AuraPrimary,
    onPrimary = AuraOnPrimary,
    primaryContainer = AuraPrimaryContainer,
    onPrimaryContainer = AuraOnPrimaryContainer,
    secondary = AuraSecondary,
    onSecondary = AuraOnSecondary,
    secondaryContainer = AuraSecondaryContainer,
    onSecondaryContainer = AuraOnSecondaryContainer,
    tertiary = AuraTertiary,
    onTertiary = AuraOnTertiary,
    tertiaryContainer = AuraTertiaryContainer,
    onTertiaryContainer = AuraOnTertiaryContainer,
    surface = AuraSurface,
    onSurface = AuraOnSurface,
    surfaceVariant = AuraSurfaceVariant,
    onSurfaceVariant = AuraOnSurfaceVariant,
    background = AuraBackground,
    onBackground = AuraOnBackground,
    error = AuraError,
    onError = AuraOnError,
    outline = AuraOutline,
    outlineVariant = AuraOutlineVariant
)

private val DarkColorScheme = darkColorScheme(
    primary = AuraDarkPrimary,
    onPrimary = AuraDarkOnPrimary,
    primaryContainer = AuraDarkPrimaryContainer,
    onPrimaryContainer = AuraDarkOnPrimaryContainer,
    secondary = AuraDarkSecondary,
    onSecondary = AuraDarkOnSecondary,
    secondaryContainer = AuraDarkSecondaryContainer,
    onSecondaryContainer = AuraDarkOnSecondaryContainer,
    tertiary = AuraDarkTertiary,
    onTertiary = AuraDarkOnTertiary,
    tertiaryContainer = AuraDarkTertiaryContainer,
    onTertiaryContainer = AuraDarkOnTertiaryContainer,
    surface = AuraDarkSurface,
    onSurface = AuraDarkOnSurface,
    surfaceVariant = AuraDarkSurfaceVariant,
    onSurfaceVariant = AuraDarkOnSurfaceVariant,
    background = AuraDarkBackground,
    onBackground = AuraDarkOnBackground,
    error = AuraDarkError,
    onError = AuraDarkOnError,
    outline = AuraDarkOutline,
    outlineVariant = AuraDarkOutlineVariant
)

@Composable
fun AuraLauncherTheme(
    darkMode: DarkMode = DarkMode.AUTO,
    dynamicColor: Boolean = true,
    content: @Composable () -> Unit
) {
    val isDark = when (darkMode) {
        DarkMode.LIGHT -> false
        DarkMode.DARK -> true
        DarkMode.AUTO -> isSystemInDarkTheme()
    }

    val colorScheme = when {
        dynamicColor && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S -> {
            if (isDark) dynamicDarkColorScheme(LocalView.current.context)
            else dynamicLightColorScheme(LocalView.current.context)
        }
        isDark -> DarkColorScheme
        else -> LightColorScheme
    }

    val view = LocalView.current
    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as Activity).window
            window.statusBarColor = Color.Transparent.toArgb()
            window.navigationBarColor = Color.Transparent.toArgb()
            WindowCompat.getInsetsController(window, view).isAppearanceLightStatusBars = !isDark
            WindowCompat.getInsetsController(window, view).isAppearanceLightNavigationBars = !isDark
        }
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = AuraTypography,
        content = content
    )
}