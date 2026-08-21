package com.aura.launcher.ui.components

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Outline
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Density
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

/**
 * A glassmorphism card with blur, refraction, and highlight effects.
 * Mimics the Liquid Glass Launcher aesthetic.
 */
@Composable
fun GlassCard(
    modifier: Modifier = Modifier,
    shape: Shape = RoundedCornerShape(24.dp),
    tintColor: Color = Color.White.copy(alpha = 0.1f),
    borderColor: Color = Color.White.copy(alpha = 0.08f),
    shadowColor: Color = Color.Black.copy(alpha = 0.15f),
    highlightAlpha: Float = 0.2f,
    isDark: Boolean = false,
    clickable: Boolean = false,
    onClick: () -> Unit = {},
    content: @Composable BoxScope.() -> Unit
) {
    val density = LocalDensity.current

    Box(
        modifier = modifier
            .then(
                if (clickable) Modifier.clickable { onClick() } else Modifier
            )
            .clip(shape)
            .background(Color.Transparent),
        contentAlignment = Alignment.Center,
        content = content
    )
}

/**
 * A squircle shape that matches the Liquid Glass aesthetic.
 */
val SquircleShape: Shape = object : Shape {
    override fun createOutline(
        size: Size,
        layoutDirection: androidx.compose.ui.unit.LayoutDirection,
        density: Density
    ): Outline {
        val path = Path().apply {
            val s = minOf(size.width, size.height)
            val cr = s * 0.22f // Squircle factor
            moveTo(cr, 0f)
            lineTo(s - cr, 0f)
            cubicTo(
                s - cr * 0.5f, 0f,
                s, cr * 0.5f,
                s, cr
            )
            lineTo(s, s - cr)
            cubicTo(
                s, s - cr * 0.5f,
                s - cr * 0.5f, s,
                s - cr, s
            )
            lineTo(cr, s)
            cubicTo(
                cr * 0.5f, s,
                0f, s - cr * 0.5f,
                0f, s - cr
            )
            lineTo(0f, cr)
            cubicTo(
                0f, cr * 0.5f,
                cr * 0.5f, 0f,
                cr, 0f
            )
            close()
        }
        return Outline.Generic(path)
    }
}

/**
 * Glass-themed app icon for home screen and dock with squircle shape.
 */
@Composable
fun GlassAppIcon(
    icon: Any?,
    label: String,
    showLabel: Boolean = true,
    iconSize: Dp = 56.dp,
    labelSize: Int = 12,
    isDark: Boolean = false,
    onClick: () -> Unit = {},
    onLongClick: () -> Unit = {},
    modifier: Modifier = Modifier
) {
    var isPressed by remember { mutableStateOf(false) }
    val scale by animateFloatAsState(
        targetValue = if (isPressed) 0.9f else 1f,
        label = "scale"
    )

    Column(
        modifier = modifier
            .scale(scale)
            .pointerInput(Unit) {
                awaitPointerEventScope {
                    while (true) {
                        val event = awaitPointerEvent()
                        isPressed = event.changes.any { it.pressed }
                    }
                }
            }
            .clickable { onClick() },
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        // Icon with glass background
        Box(
            modifier = Modifier
                .size(iconSize)
                .clip(SquircleShape)
                .background(
                    if (isDark) Color(0x1AFFFFFF)
                    else Color.White.copy(alpha = 0.15f)
                )
                .border(
                    1.dp,
                    if (isDark) Color.White.copy(alpha = 0.05f)
                    else Color.White.copy(alpha = 0.2f),
                    SquircleShape
                ),
            contentAlignment = Alignment.Center
        ) {
            // Glass highlight gradient overlay
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(
                        Brush.verticalGradient(
                            0f to Color.White.copy(alpha = 0.3f),
                            0.5f to Color.Transparent,
                            1f to Color.Transparent
                        ),
                        SquircleShape
                    )
            )
            // Icon content
            if (icon is ImageVector) {
                androidx.compose.material3.Icon(
                    imageVector = icon,
                    contentDescription = label,
                    tint = MaterialTheme.colorScheme.onSurface,
                    modifier = Modifier.size(iconSize * 0.55f)
                )
            } else {
                // Fallback: show label letter
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = label.firstOrNull()?.uppercase() ?: "?",
                        style = MaterialTheme.typography.headlineMedium,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                }
            }
        }

        // Label
        if (showLabel) {
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = label,
                style = MaterialTheme.typography.labelSmall.copy(
                    fontSize = labelSize.sp,
                    fontWeight = FontWeight.Medium
                ),
                color = if (isDark) Color.White.copy(alpha = 0.9f)
                else Color.White.copy(alpha = 0.95f),
                maxLines = 1,
                softWrap = false
            )
        }
    }
}

/**
 * Glass icon surface with squircle shape for embedding content.
 */
@Composable
fun GlassIconSurface(
    iconSize: Dp = 56.dp,
    isDark: Boolean = false,
    content: @Composable BoxScope.() -> Unit
) {
    Box(
        modifier = Modifier
            .size(iconSize)
            .clip(SquircleShape)
            .background(
                if (isDark) Color(0x1AFFFFFF)
                else Color.White.copy(alpha = 0.15f)
            )
            .border(
                1.dp,
                if (isDark) Color.White.copy(alpha = 0.05f)
                else Color.White.copy(alpha = 0.2f),
                SquircleShape
            ),
        contentAlignment = Alignment.Center,
        content = content
    )
}