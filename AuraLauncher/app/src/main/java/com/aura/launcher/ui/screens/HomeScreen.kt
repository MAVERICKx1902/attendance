package com.aura.launcher.ui.screens

import android.app.WallpaperManager
import android.graphics.Bitmap
import android.graphics.drawable.BitmapDrawable
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.Wallpaper
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.aura.launcher.model.AppInfo
import com.aura.launcher.ui.components.GlassAppIcon
import com.aura.launcher.ui.components.GlassCard
import com.aura.launcher.ui.components.GlassDock
import com.aura.launcher.ui.components.GlassSearchBar
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

/**
 * The main home screen with wallpaper, pages, search bar, app grid, and dock.
 */
@Composable
fun HomeScreen(
    apps: List<AppInfo>,
    dockApps: List<AppInfo>,
    isDark: Boolean,
    blurIntensity: Float,
    pageCount: Int = 3,
    currentPage: Int = 0,
    onAppClick: (AppInfo) -> Unit,
    onOpenDrawer: () -> Unit,
    onOpenSettings: () -> Unit,
    onSearch: (String) -> Unit,
    onPageChange: (Int) -> Unit,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    var searchQuery by remember { mutableStateOf("") }
    val pagerState = rememberPagerState(
        initialPage = currentPage,
        pageCount = { pageCount }
    )

    // Load wallpaper bitmap
    var wallpaperBitmap by remember { mutableStateOf<Bitmap?>(null) }

    LaunchedEffect(Unit) {
        withContext(Dispatchers.IO) {
            try {
                val wm = WallpaperManager.getInstance(context)
                val drawable = wm.drawable
                if (drawable is BitmapDrawable) {
                    wallpaperBitmap = drawable.bitmap
                }
            } catch (e: Exception) {
                // Fallback handled in UI
            }
        }
    }

    // Sync pager changes
    LaunchedEffect(pagerState.currentPage) {
        onPageChange(pagerState.currentPage)
    }

    Box(
        modifier = modifier.fillMaxSize()
    ) {
        // Wallpaper background
        if (wallpaperBitmap != null) {
            Image(
                bitmap = wallpaperBitmap!!.asImageBitmap(),
                contentDescription = "Wallpaper",
                contentScale = ContentScale.Crop,
                modifier = Modifier.fillMaxSize()
            )
        } else {
            // Gradient fallback
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(
                        if (isDark) Color(0xFF121212)
                        else Color(0xFFF0F0F0)
                    )
            )
        }

        // Semi-transparent overlay for readability
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    if (isDark) Color.Black.copy(alpha = 0.3f)
                    else Color.Black.copy(alpha = 0.15f)
                )
        )

        // Main content
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(top = 48.dp) // Status bar padding
        ) {
            // Search bar at top
            GlassSearchBar(
                query = searchQuery,
                onQueryChange = { searchQuery = it },
                onSearch = { onSearch(searchQuery) },
                isDark = isDark,
                modifier = Modifier.padding(top = 8.dp)
            )

            // Home screen pages (Pager)
            HorizontalPager(
                state = pagerState,
                modifier = Modifier
                    .weight(1f)
                    .fillMaxWidth()
            ) { page ->
                PageContent(
                    page = page,
                    apps = apps,
                    isDark = isDark,
                    onAppClick = onAppClick
                )
            }

            // Page indicators
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 4.dp),
                horizontalArrangement = Arrangement.Center
            ) {
                repeat(pageCount) { index ->
                    Box(
                        modifier = Modifier
                            .padding(horizontal = 3.dp)
                            .size(
                                if (pagerState.currentPage == index) 8.dp else 6.dp
                            )
                            .clip(CircleShape)
                            .background(
                                if (pagerState.currentPage == index)
                                    Color.White.copy(alpha = 0.9f)
                                else
                                    Color.White.copy(alpha = 0.3f)
                            )
                    )
                }
            }

            // Dock
            GlassDock(
                dockApps = dockApps,
                maxIcons = 5,
                showLabels = false,
                isDark = isDark,
                onAppClick = onAppClick
            )

            // Bottom bar with quick actions
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(Color.Black.copy(alpha = 0.15f))
                    .padding(horizontal = 16.dp, vertical = 4.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    // Open drawer button
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(12.dp))
                            .background(Color.White.copy(alpha = 0.1f))
                            .pointerInput(Unit) {
                                detectTapGestures(
                                    onTap = { onOpenDrawer() },
                                    onLongPress = { onOpenSettings() }
                                )
                            }
                            .padding(horizontal = 20.dp, vertical = 10.dp)
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                Icons.Default.Wallpaper,
                                contentDescription = "Open drawer",
                                tint = Color.White.copy(alpha = 0.8f),
                                modifier = Modifier.size(18.dp)
                            )
                            Spacer(modifier = Modifier.size(6.dp))
                            Text(
                                "Apps",
                                color = Color.White.copy(alpha = 0.9f),
                                fontSize = 14.sp,
                                fontWeight = FontWeight.Medium
                            )
                        }
                    }

                    // Settings button
                    IconButton(onClick = onOpenSettings) {
                        Icon(
                            Icons.Default.Settings,
                            contentDescription = "Settings",
                            tint = Color.White.copy(alpha = 0.7f),
                            modifier = Modifier.size(22.dp)
                        )
                    }
                }
            }
        }
    }
}

/**
 * Content for a single home screen page - shows apps in a grid.
 */
@Composable
fun PageContent(
    page: Int,
    apps: List<AppInfo>,
    isDark: Boolean,
    onAppClick: (AppInfo) -> Unit
) {
    // Divide apps into pages of 8 (2 rows of 4)
    val pageSize = 8
    val pageApps = remember(apps, page) {
        val start = page * pageSize
        val end = minOf(start + pageSize, apps.size)
        if (start < apps.size) apps.subList(start, end) else emptyList()
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 24.dp, vertical = 16.dp),
        contentAlignment = Alignment.Center
    ) {
        if (pageApps.isEmpty()) {
            // Empty page - show placeholder
            GlassCard(
                shape = RoundedCornerShape(28.dp),
                tintColor = if (isDark) Color(0x0AFFFFFF) else Color.White.copy(alpha = 0.06f),
                isDark = isDark,
                modifier = Modifier.padding(16.dp)
            ) {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text(
                        text = "+",
                        fontSize = 48.sp,
                        color = Color.White.copy(alpha = 0.3f),
                        fontWeight = FontWeight.Light
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = "Add apps to this page",
                        color = Color.White.copy(alpha = 0.4f),
                        fontSize = 14.sp
                    )
                }
            }
        } else {
            // App grid
            LazyVerticalGrid(
                columns = GridCells.Fixed(4),
                modifier = Modifier.fillMaxSize(),
                horizontalArrangement = Arrangement.SpaceEvenly,
                verticalArrangement = Arrangement.spacedBy(12.dp),
                contentPadding = PaddingValues(8.dp)
            ) {
                items(pageApps) { app ->
                    GlassAppIcon(
                        icon = app.icon,
                        label = app.label,
                        showLabel = true,
                        iconSize = 54.dp,
                        labelSize = 12,
                        isDark = isDark,
                        onClick = { onAppClick(app) }
                    )
                }
            }
        }
    }
}