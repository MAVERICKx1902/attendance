package com.aura.launcher.viewmodel

import android.app.Application
import android.content.Intent
import android.graphics.drawable.Drawable
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.aura.launcher.model.AppInfo
import com.aura.launcher.model.DarkMode
import com.aura.launcher.model.LauncherConfig
import com.aura.launcher.utils.AppUtils
import com.aura.launcher.utils.PreferencesManager
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

class LauncherViewModel(application: Application) : AndroidViewModel(application) {

    private val prefsManager = PreferencesManager(application)

    // Config from DataStore
    val config: StateFlow<LauncherConfig> = prefsManager.config
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), LauncherConfig())

    // All installed apps
    private val _allApps = MutableStateFlow<List<AppInfo>>(emptyList())
    val allApps: StateFlow<List<AppInfo>> = _allApps.asStateFlow()

    // Dock apps (filtered from all apps)
    private val _dockApps = MutableStateFlow<List<AppInfo>>(emptyList())
    val dockApps: StateFlow<List<AppInfo>> = _dockApps.asStateFlow()

    // Current home screen page
    private val _currentPage = MutableStateFlow(0)
    val currentPage: StateFlow<Int> = _currentPage.asStateFlow()

    // Search query
    private val _searchQuery = MutableStateFlow("")
    val searchQuery: StateFlow<String> = _searchQuery.asStateFlow()

    // UI state
    private val _isDrawerOpen = MutableStateFlow(false)
    val isDrawerOpen: StateFlow<Boolean> = _isDrawerOpen.asStateFlow()

    private val _isSettingsOpen = MutableStateFlow(false)
    val isSettingsOpen: StateFlow<Boolean> = _isSettingsOpen.asStateFlow()

    init {
        loadApps()
    }

    private fun loadApps() {
        viewModelScope.launch {
            val context = getApplication<Application>()
            val apps = AppUtils.getInstalledApps(context)
            val hidden = config.value.hiddenApps
            _allApps.value = apps.filter { it.packageName !in hidden }

            // Setup dock apps
            val dockPackageNames = prefsManager.getDockApps()
            _dockApps.value = dockPackageNames.mapNotNull { pkg ->
                apps.find { it.packageName == pkg }
            }

            // Ensure dock has apps even if names don't match
            if (_dockApps.value.isEmpty() && apps.isNotEmpty()) {
                _dockApps.value = apps.take(5)
            }
        }
    }

    fun refreshApps() {
        loadApps()
    }

    fun setCurrentPage(page: Int) {
        _currentPage.value = page
    }

    fun setSearchQuery(query: String) {
        _searchQuery.value = query
    }

    fun openDrawer() {
        _isDrawerOpen.value = true
    }

    fun closeDrawer() {
        _isDrawerOpen.value = false
    }

    fun toggleSettings() {
        _isSettingsOpen.value = !_isSettingsOpen.value
    }

    fun openSettings() {
        _isSettingsOpen.value = true
    }

    fun closeSettings() {
        _isSettingsOpen.value = false
    }

    fun launchApp(app: AppInfo) {
        val context = getApplication<Application>()
        AppUtils.launchApp(context, app.packageName, app.activityName)
    }

    fun launchAppByPackage(packageName: String, activityName: String) {
        val context = getApplication<Application>()
        AppUtils.launchApp(context, packageName, activityName)
    }

    fun performSearch(query: String) {
        // Open app drawer with search filter or launch web search
        if (query.isNotBlank()) {
            val matchingApp = _allApps.value.find {
                it.label.equals(query, ignoreCase = true) ||
                        it.packageName.equals(query, ignoreCase = true)
            }
            if (matchingApp != null) {
                launchApp(matchingApp)
            } else {
                // Fallback to web search
                val context = getApplication<Application>()
                val webIntent = Intent(Intent.ACTION_WEB_SEARCH).apply {
                    putExtra(android.provider.SearchManager.QUERY, query)
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK
                }
                try {
                    context.startActivity(webIntent)
                } catch (e: Exception) {
                    // No browser available
                }
            }
        }
    }

    fun updateConfig(update: LauncherConfig.() -> LauncherConfig) {
        viewModelScope.launch {
            prefsManager.updateConfig(update)
        }
    }

    fun updateDockApps(packageNames: List<String>) {
        viewModelScope.launch {
            prefsManager.saveDockApps(packageNames)
            loadApps()
        }
    }

    fun hideApp(packageName: String) {
        viewModelScope.launch {
            val current = config.value
            prefsManager.saveConfig(current.copy(
                hiddenApps = current.hiddenApps + packageName
            ))
            loadApps()
        }
    }

    fun unhideApp(packageName: String) {
        viewModelScope.launch {
            val current = config.value
            prefsManager.saveConfig(current.copy(
                hiddenApps = current.hiddenApps - packageName
            ))
            loadApps()
        }
    }

    fun isFirstLaunch(): Boolean {
        return viewModelScope.let {
            try {
                kotlinx.coroutines.runBlocking {
                    prefsManager.isFirstLaunch()
                }
            } catch (e: Exception) {
                true
            }
        }
    }

    fun setFirstLaunchComplete() {
        viewModelScope.launch {
            prefsManager.setFirstLaunchComplete()
        }
    }
}