package com.aura.launcher.service

import android.service.wallpaper.WallpaperService
import android.graphics.Canvas
import android.graphics.Rect
import android.os.Handler
import android.os.HandlerThread
import android.view.SurfaceHolder

/**
 * Simple wallpaper service for live wallpaper functionality.
 */
class AuraWallpaperService : WallpaperService() {

    override fun onCreateEngine(): Engine {
        return AuraWallpaperEngine()
    }

    private inner class AuraWallpaperEngine : Engine() {

        private val handlerThread = HandlerThread("WallpaperEngine")
        private var handler: Handler? = null
        private var isVisible = false

        override fun onCreate(surfaceHolder: SurfaceHolder) {
            super.onCreate(surfaceHolder)
            handlerThread.start()
            handler = Handler(handlerThread.looper)
        }

        override fun onVisibilityChanged(visible: Boolean) {
            isVisible = visible
            if (visible) {
                drawFrame()
            } else {
                handler?.removeCallbacksAndMessages(null)
            }
        }

        override fun onSurfaceChanged(holder: SurfaceHolder, format: Int, width: Int, height: Int) {
            super.onSurfaceChanged(holder, format, width, height)
            drawFrame()
        }

        override fun onDestroy() {
            handler?.removeCallbacksAndMessages(null)
            handlerThread.quitSafely()
            super.onDestroy()
        }

        private fun drawFrame() {
            if (!isVisible) return

            val holder = surfaceHolder
            var canvas: Canvas? = null
            try {
                canvas = holder.lockCanvas()
                if (canvas != null) {
                    // Draw wallpaper content (could be gradient, pattern, etc.)
                    // For now, this is a placeholder - the actual wallpaper
                    // rendering is handled by the system wallpaper manager
                }
            } finally {
                canvas?.let { holder.unlockCanvasAndPost(it) }
            }

            // Schedule next frame if needed
            handler?.postDelayed({ drawFrame() }, 16) // ~60fps
        }
    }
}