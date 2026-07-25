package com.guido2730.tvvpn

import android.content.Context
import android.os.Handler
import android.os.Looper
import com.wireguard.android.backend.GoBackend
import com.wireguard.android.backend.Tunnel
import com.wireguard.config.Config
import java.util.concurrent.CopyOnWriteArrayList
import java.util.concurrent.Executors

object VpnManager {

    private const val TUNNEL_NAME = "tvvpn0"

    private var backend: GoBackend? = null
    private var tunnel: TvVpnTunnel? = null
    private val executor = Executors.newSingleThreadExecutor()
    private val mainHandler = Handler(Looper.getMainLooper())
    private val listeners = CopyOnWriteArrayList<(Tunnel.State) -> Unit>()

    @Volatile
    var currentState: Tunnel.State = Tunnel.State.DOWN
        private set

    fun addListener(listener: (Tunnel.State) -> Unit) {
        listeners.add(listener)
        listener(currentState)
    }

    fun removeListener(listener: (Tunnel.State) -> Unit) {
        listeners.remove(listener)
    }

    private fun ensureBackend(context: Context): Pair<GoBackend, TvVpnTunnel> {
        val existingBackend = backend
        val existingTunnel = tunnel
        if (existingBackend != null && existingTunnel != null) {
            return existingBackend to existingTunnel
        }

        val newBackend = GoBackend(context.applicationContext)
        val newTunnel = TvVpnTunnel(TUNNEL_NAME) { state ->
            currentState = state
            mainHandler.post { listeners.forEach { it(state) } }
        }
        backend = newBackend
        tunnel = newTunnel
        return newBackend to newTunnel
    }

    fun connect(context: Context, config: Config, onError: (Exception) -> Unit) {
        val (goBackend, tvTunnel) = ensureBackend(context)
        executor.execute {
            try {
                goBackend.setState(tvTunnel, Tunnel.State.UP, config)
            } catch (e: Exception) {
                mainHandler.post { onError(e) }
            }
        }
    }

    fun disconnect(context: Context, onError: (Exception) -> Unit) {
        val (goBackend, tvTunnel) = ensureBackend(context)
        executor.execute {
            try {
                goBackend.setState(tvTunnel, Tunnel.State.DOWN, null)
            } catch (e: Exception) {
                mainHandler.post { onError(e) }
            }
        }
    }
}
