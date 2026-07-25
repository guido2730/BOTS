package com.guido2730.tvvpn

import com.wireguard.android.backend.Tunnel

class TvVpnTunnel(
    private val tunnelName: String,
    private val onStateChanged: (Tunnel.State) -> Unit
) : Tunnel {

    override fun getName(): String = tunnelName

    override fun onStateChange(newState: Tunnel.State) {
        onStateChanged(newState)
    }
}
