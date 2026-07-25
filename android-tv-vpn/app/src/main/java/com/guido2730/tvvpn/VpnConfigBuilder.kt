package com.guido2730.tvvpn

import com.wireguard.config.Config
import com.wireguard.config.Interface
import java.io.BufferedReader
import java.io.StringReader

/**
 * Rebuilds the user-supplied WireGuard config so that only [targetPackage]
 * is routed through the tunnel, regardless of what the pasted config says.
 * This is what makes the VPN apply to a single "app objetivo".
 */
object VpnConfigBuilder {

    fun buildRestrictedConfig(rawConfigText: String, targetPackage: String): Config {
        val parsed = Config.parse(BufferedReader(StringReader(rawConfigText)))
        val sourceInterface = parsed.getInterface()

        val interfaceBuilder = Interface.Builder()
            .setKeyPair(sourceInterface.keyPair)
            .addAddresses(sourceInterface.addresses)
            .addDnsServers(sourceInterface.dnsServers)
            .addDnsSearchDomains(sourceInterface.dnsSearchDomains)
            .includeApplication(targetPackage)

        if (sourceInterface.listenPort.isPresent) {
            interfaceBuilder.setListenPort(sourceInterface.listenPort.get())
        }
        if (sourceInterface.mtu.isPresent) {
            interfaceBuilder.setMtu(sourceInterface.mtu.get())
        }

        val restrictedInterface = interfaceBuilder.build()

        return Config.Builder()
            .setInterface(restrictedInterface)
            .addPeers(parsed.peers)
            .build()
    }
}
