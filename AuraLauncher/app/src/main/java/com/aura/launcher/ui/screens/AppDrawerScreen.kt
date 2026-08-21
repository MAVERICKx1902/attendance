package com.aura.launcher.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
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
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.GridView
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextField
import androidx.compose.material3.TextFieldDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.aura.launcher.model.AppInfo
import com.aura.launcher.ui.components.GlassAppIcon
import com.aura.launcher.ui.theme.CategoryCommunication
import com.aura.launcher.ui.theme.CategoryGame
import com.aura.launcher.ui.theme.CategoryMedia
import com.aura.launcher.ui.theme.CategoryOther
import com.aura.launcher.ui.theme.CategoryProductivity
import com.aura.launcher.ui.theme.CategoryShopping
import com.aura.launcher.ui.theme.CategorySocial
import com.aura.launcher.ui.theme.CategoryTool
import com.aura.launcher.utils.AppUtils

/**
 * Full-screen app drawer with category tabs, search, and A-Z index.
 */
@Composable
fun AppDrawerScreen(
    apps: List<AppInfo>,
    isDark: Boolean,
    onAppClick: (AppInfo) -> Unit,
    onDismiss: () -> Unit,
    modifier: Modifier = Modifier
) {
    var searchQuery by remember { mutableStateOf("") }
    var selectedCategory by remember { mutableStateOf("All") }
    var showAlphabetIndex by remember { mutableStateOf(false) }

    // Categorize apps
    val categorized = remember(apps) {
        apps.groupBy { app ->
            AppUtils.categorizeApp(app)
        }
    }

    val categories = remember(categorized) {
        listOf("All") + categorized.keys.sorted()
    }

    // Filter apps
    val filteredApps = remember(apps, searchQuery, selectedCategory) {
        val filtered = if (selectedCategory == "All") apps
        else categorized[selectedCategory] ?: emptyList()

        if (searchQuery.isBlank()) filtered
        else filtered.filter {
            it.label.contains(searchQuery, ignoreCase = true) ||
                    it.packageName.contains(searchQuery, ignoreCase = true)
        }
    }

    // Group by first letter for A-Z index
    val alphabetGrouped = remember(filteredApps) {
        filteredApps.groupBy { app ->
            app.label.firstOrNull()?.uppercase() ?: "#"
        }.toSortedMap()
    }

    Column(
        modifier = modifier
            .fillMaxSize()
            .background(Color.Black.copy(alpha = 0.7f))
    ) {
        // Header with search
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .background(Color.Black.copy(alpha = 0.3f))
                .padding(top = 48.dp, bottom = 8.dp)
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                IconButton(onClick = onDismiss) {
                    Icon(
                        Icons.Default.Close,
                        contentDescription = "Close drawer",
                        tint = Color.White
                    )
                }

                Spacer(modifier = Modifier.width(8.dp))

                // Search field
                Box(
                    modifier = Modifier
                        .weight(1f)
                        .height(44.dp)
                        .clip(RoundedCornerShape(22.dp))
                        .background(Color.White.copy(alpha = 0.1f))
                        .border(1.dp, Color.White.copy(alpha = 0.1f), RoundedCornerShape(22.dp))
                        .padding(horizontal = 16.dp),
                    contentAlignment = Alignment.CenterStart
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            Icons.Default.Search,
                            contentDescription = null,
                            tint = Color.White.copy(alpha = 0.6f),
                            modifier = Modifier.size(20.dp)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        TextField(
                            value = searchQuery,
                            onValueChange = { searchQuery = it },
                            placeholder = {
                                Text(
                                    "Search apps",
                                    color = Color.White.copy(alpha = 0.4f),
                                    fontSize = 15.sp
                                )
                            },
                            textStyle = MaterialTheme.typography.bodyMedium.copy(
                                color = Color.White.copy(alpha = 0.9f)
                            ),
                            colors = TextFieldDefaults.colors(
                                focusedContainerColor = Color.Transparent,
                                unfocusedContainerColor = Color.Transparent,
                                focusedIndicatorColor = Color.Transparent,
                                unfocusedIndicatorColor = Color.Transparent
                            ),
                            modifier = Modifier.weight(1f),
                            singleLine = true
                        )
                    }
                }
            }
        }

        // Category chips row
        LazyRow(
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = 4.dp),
            contentPadding = PaddingValues(horizontal = 16.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            items(categories) { category ->
                CategoryChip(
                    label = category,
                    isSelected = selectedCategory == category,
                    onClick = { selectedCategory = category }
                )
            }
        }

        // Alphabet Index toggle button
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 4.dp),
            contentAlignment = Alignment.CenterEnd
        ) {
            Box(
                modifier = Modifier
                    .clip(RoundedCornerShape(16.dp))
                    .background(Color.White.copy(alpha = 0.1f))
                    .clickable { showAlphabetIndex = !showAlphabetIndex }
                    .padding(horizontal = 12.dp, vertical = 6.dp)
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        Icons.Default.GridView,
                        contentDescription = null,
                        tint = Color.White.copy(alpha = 0.7f),
                        modifier = Modifier.size(16.dp)
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        "A-Z",
                        color = Color.White.copy(alpha = 0.7f),
                        fontSize = 12.sp
                    )
                }
            }
        }

        // Alphabetical grid or categorized view
        if (showAlphabetIndex && searchQuery.isBlank()) {
            // A-Z Indexed view
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(horizontal = 16.dp)
            ) {
                alphabetGrouped.forEach { (letter, appsInGroup) ->
                    item {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier.padding(vertical = 8.dp)
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(32.dp)
                                    .clip(RoundedCornerShape(8.dp))
                                    .background(
                                        Brush.horizontalGradient(
                                            colors = listOf(
                                                MaterialTheme.colorScheme.primary,
                                                MaterialTheme.colorScheme.primary.copy(alpha = 0.7f)
                                            )
                                        )
                                    ),
                                contentAlignment = Alignment.Center
                            ) {
                                Text(
                                    text = letter,
                                    color = Color.White,
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 14.sp
                                )
                            }
                            Spacer(modifier = Modifier.width(12.dp))
                            Text(
                                text = "${appsInGroup.size} apps",
                                color = Color.White.copy(alpha = 0.5f),
                                fontSize = 13.sp
                            )
                        }
                    }

                    items(appsInGroup.chunked(4)) { rowApps ->
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceEvenly
                        ) {
                            rowApps.forEach { app ->
                                GlassAppIcon(
                                    icon = app.icon,
                                    label = app.label,
                                    showLabel = true,
                                    iconSize = 48.dp,
                                    labelSize = 11,
                                    isDark = true,
                                    onClick = { onAppClick(app) },
                                    modifier = Modifier.weight(1f)
                                )
                            }
                        }
                        Spacer(modifier = Modifier.height(8.dp))
                    }
                }
            }
        } else {
            // Grid view
            LazyVerticalGrid(
                columns = GridCells.Adaptive(72.dp),
                modifier = Modifier
                    .fillMaxSize()
                    .padding(horizontal = 12.dp),
                horizontalArrangement = Arrangement.SpaceEvenly,
                verticalArrangement = Arrangement.spacedBy(8.dp),
                contentPadding = PaddingValues(vertical = 8.dp)
            ) {
                items(filteredApps) { app ->
                    GlassAppIcon(
                        icon = app.icon,
                        label = app.label,
                        showLabel = true,
                        iconSize = 52.dp,
                        labelSize = 11,
                        isDark = true,
                        onClick = { onAppClick(app) }
                    )
                }
            }
        }
    }
}

@Composable
fun CategoryChip(
    label: String,
    isSelected: Boolean,
    onClick: () -> Unit
) {
    val categoryColor = when (label) {
        AppInfo.CATEGORY_GAMES -> CategoryGame
        AppInfo.CATEGORY_SOCIAL -> CategorySocial
        AppInfo.CATEGORY_TOOLS -> CategoryTool
        AppInfo.CATEGORY_MEDIA -> CategoryMedia
        AppInfo.CATEGORY_PRODUCTIVITY -> CategoryProductivity
        AppInfo.CATEGORY_COMMUNICATION -> CategoryCommunication
        AppInfo.CATEGORY_SHOPPING -> CategoryShopping
        AppInfo.CATEGORY_OTHER -> CategoryOther
        else -> Color.White.copy(alpha = 0.3f)
    }

    Box(
        modifier = Modifier
            .clip(RoundedCornerShape(20.dp))
            .background(
                if (isSelected) categoryColor.copy(alpha = 0.8f)
                else Color.White.copy(alpha = 0.08f)
            )
            .border(
                1.dp,
                if (isSelected) categoryColor.copy(alpha = 0.5f)
                else Color.White.copy(alpha = 0.05f),
                RoundedCornerShape(20.dp)
            )
            .clickable { onClick() }
            .padding(horizontal = 16.dp, vertical = 8.dp),
        contentAlignment = Alignment.Center
    ) {
        Text(
            text = label,
            color = if (isSelected) Color.White
            else Color.White.copy(alpha = 0.7f),
            fontSize = 13.sp,
            fontWeight = if (isSelected) FontWeight.SemiBold else FontWeight.Normal
        )
    }
}