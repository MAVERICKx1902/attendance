package com.aura.launcher.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

/**
 * Glass-styled search bar for apps and web.
 * Located at the top of the home screen.
 */
@Composable
fun GlassSearchBar(
    query: String = "",
    onQueryChange: (String) -> Unit = {},
    onSearch: () -> Unit = {},
    onMicClick: () -> Unit = {},
    isDark: Boolean = false,
    modifier: Modifier = Modifier
) {
    Box(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp)
            .height(52.dp)
            .clip(RoundedCornerShape(26.dp))
            .background(
                if (isDark) Color(0x2AFFFFFF)
                else Color.White.copy(alpha = 0.15f)
            )
            .border(
                1.dp,
                if (isDark) Color.White.copy(alpha = 0.08f)
                else Color.White.copy(alpha = 0.2f),
                RoundedCornerShape(26.dp)
            )
            .padding(horizontal = 16.dp),
        contentAlignment = Alignment.CenterStart
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                imageVector = Icons.Default.Search,
                contentDescription = "Search",
                tint = if (isDark) Color.White.copy(alpha = 0.7f)
                else Color.White.copy(alpha = 0.8f),
                modifier = Modifier.size(20.dp)
            )

            Spacer(modifier = Modifier.width(12.dp))

            BasicTextField(
                value = query,
                onValueChange = onQueryChange,
                singleLine = true,
                textStyle = TextStyle(
                    color = if (isDark) Color.White.copy(alpha = 0.9f)
                    else Color.White.copy(alpha = 0.95f),
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Normal
                ),
                cursorBrush = SolidColor(
                    if (isDark) Color.White.copy(alpha = 0.7f)
                    else Color.White.copy(alpha = 0.8f)
                ),
                modifier = Modifier.weight(1f),
                decorationBox = { innerTextField ->
                    Box {
                        if (query.isEmpty()) {
                            Text(
                                text = "Search apps & web\u2026",
                                color = if (isDark) Color.White.copy(alpha = 0.4f)
                                else Color.White.copy(alpha = 0.5f),
                                fontSize = 16.sp
                            )
                        }
                        innerTextField()
                    }
                }
            )

            Spacer(modifier = Modifier.width(8.dp))

            Box(
                modifier = Modifier
                    .size(32.dp)
                    .clip(RoundedCornerShape(16.dp))
                    .background(
                        if (isDark) Color(0x1AFFFFFF)
                        else Color.White.copy(alpha = 0.1f)
                    )
                    .clickable { onMicClick() },
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = Icons.Default.Mic,
                    contentDescription = "Voice search",
                    tint = if (isDark) Color.White.copy(alpha = 0.7f)
                    else Color.White.copy(alpha = 0.8f),
                    modifier = Modifier.size(18.dp)
                )
            }
        }
    }
}