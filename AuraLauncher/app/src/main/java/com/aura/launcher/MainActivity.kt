package com.aura.launcher

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import androidx.lifecycle.viewmodel.compose.viewModel
import com.aura.launcher.model.DarkMode
import com.aura.launcher.model.LauncherConfig
import com.aura.launcher.ui.screens.AppDrawerScreen
import com.aura.launcher.ui.screens.HomeScreen
import com.aura.launcher.ui.screens.SettingsScreen
import com.aura.launcher.ui.theme.AuraLauncherTheme
import com.aura.launcher.viewmodel.LauncherViewModel

class MainActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        installSplashScreen()
        super.onCreate(savedInstanceState)

        enableEdgeToEdge(
            statusBarStyle = androidx.activity.SystemBarStyle.Transparent,
            navigationBarStyle = androidx.activity.SystemBarStyle.Transparent
        )

        setContent {
            val viewModel: LauncherViewModel = viewModel()

            val config by viewModel.config.collectAsState()
            val allApps by viewModel.allApps.collectAsState()
            val dockApps by viewModel.dockApps.collectAsState()
            val currentPage by viewModel.currentPage.collectAsState()
            val isDrawerOpen by viewModel.isDrawerOpen.collectAsState()
            val isSettingsOpen by viewModel.isSettingsOpen.collectAsState()
            val searchQuery by viewModel.searchQuery.collectAsState()

            val isDark = when (config.darkMode) {
                DarkMode.LIGHT -> false
                DarkMode.DARK -> true
                DarkMode.AUTO -> androidx.compose.foundation.isSystemInDarkTheme()
            }

            AuraLauncherTheme(
                darkMode = config.darkMode,
                dynamicColor = true
            ) {
                AnimatedContent(
                    targetState = if (isDrawerOpen) "drawer" else "home",
                    transitionSpec = {
                        fadeIn() togetherWith fadeOut()
                    },
                    label = "screen_transition"
                ) { screen ->
                    when (screen) {
                        "drawer" -> {
                            AppDrawerScreen(
                                apps = allApps,
                                isDark = isDark,
                                onAppClick = { app ->
                                    viewModel.launchApp(app)
                                },
                                onDismiss = { viewModel.closeDrawer() },
                                modifier = Modifier.fillMaxSize()
                            )
                        }

                        else -> {
                            HomeScreen(
                                apps = allApps,
                                dockApps = dockApps,
                                isDark = isDark,
                                blurIntensity = config.blurIntensity,
                                pageCount = config.homeScreenPages,
                                currentPage = currentPage,
                                onAppClick = { app ->
                                    viewModel.launchApp(app)
                                },
                                onOpenDrawer = { viewModel.openDrawer() },
                                onOpenSettings = { viewModel.openSettings() },
                                onSearch = { query ->
                                    viewModel.performSearch(query)
                                },
                                onPageChange = { page ->
                                    viewModel.setCurrentPage(page)
                                },
                                modifier = Modifier.fillMaxSize()
                            )
                        }
                    }
                }

                // Settings bottom sheet
                if (isSettingsOpen) {
                    SettingsScreen(
                        config = config,
                        isDark = isDark,
                        onConfigChange = { newConfig ->
                            viewModel.updateConfig { newConfig }
                        },
                        onDismiss = { viewModel.closeSettings() }
                    )
                }
            }
        }
    }
}