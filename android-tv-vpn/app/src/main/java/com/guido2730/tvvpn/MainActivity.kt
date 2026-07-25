package com.guido2730.tvvpn

import android.app.Activity
import android.content.Intent
import android.net.VpnService
import android.os.Bundle
import android.widget.Button
import android.widget.ImageView
import android.widget.TextView
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import com.wireguard.android.backend.Tunnel

class MainActivity : AppCompatActivity() {

    private lateinit var tvStatus: TextView
    private lateinit var tvTargetAppName: TextView
    private lateinit var ivTargetIcon: ImageView
    private lateinit var btnConnectToggle: Button

    private val stateListener: (Tunnel.State) -> Unit = { state ->
        runOnUiThread { updateStatusUi(state) }
    }

    private val appPickerLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        if (result.resultCode == Activity.RESULT_OK) {
            val pkg = result.data?.getStringExtra(AppPickerActivity.EXTRA_PACKAGE_NAME)
            val label = result.data?.getStringExtra(AppPickerActivity.EXTRA_LABEL)
            if (pkg != null && label != null) {
                PrefsRepository.setTargetApp(this, pkg, label)
                refreshTargetAppUi()
            }
        }
    }

    private val vpnConfigLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) {
        refreshButtons()
    }

    private val vpnPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        if (result.resultCode == Activity.RESULT_OK) {
            startVpn()
        } else {
            Toast.makeText(this, R.string.vpn_permission_denied, Toast.LENGTH_LONG).show()
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        tvStatus = findViewById(R.id.tvStatus)
        tvTargetAppName = findViewById(R.id.tvTargetAppName)
        ivTargetIcon = findViewById(R.id.ivTargetIcon)
        btnConnectToggle = findViewById(R.id.btnConnectToggle)

        findViewById<Button>(R.id.btnSelectApp).setOnClickListener {
            appPickerLauncher.launch(Intent(this, AppPickerActivity::class.java))
        }
        findViewById<Button>(R.id.btnConfigureVpn).setOnClickListener {
            vpnConfigLauncher.launch(Intent(this, VpnConfigActivity::class.java))
        }
        btnConnectToggle.setOnClickListener { onToggleConnection() }

        refreshTargetAppUi()
    }

    override fun onStart() {
        super.onStart()
        VpnManager.addListener(stateListener)
        refreshButtons()
    }

    override fun onStop() {
        super.onStop()
        VpnManager.removeListener(stateListener)
    }

    private fun refreshTargetAppUi() {
        val target = PrefsRepository.getTargetApp(this)
        if (target == null) {
            tvTargetAppName.text = getString(R.string.no_target_app_selected)
            ivTargetIcon.setImageDrawable(null)
        } else {
            tvTargetAppName.text = target.label
            val icon = runCatching { packageManager.getApplicationIcon(target.packageName) }.getOrNull()
            ivTargetIcon.setImageDrawable(icon)
        }
        refreshButtons()
    }

    private fun refreshButtons() {
        val hasTarget = PrefsRepository.getTargetApp(this) != null
        val hasConfig = PrefsRepository.hasConfig(this)
        btnConnectToggle.isEnabled = hasTarget && hasConfig
        updateStatusUi(VpnManager.currentState)
    }

    private fun updateStatusUi(state: Tunnel.State) {
        if (state == Tunnel.State.UP) {
            tvStatus.text = getString(R.string.status_connected)
            btnConnectToggle.text = getString(R.string.action_disconnect)
        } else {
            tvStatus.text = getString(R.string.status_disconnected)
            btnConnectToggle.text = getString(R.string.action_connect)
        }
    }

    private fun onToggleConnection() {
        if (VpnManager.currentState == Tunnel.State.UP) {
            VpnManager.disconnect(this) { e ->
                Toast.makeText(this, getString(R.string.error_disconnect, e.message), Toast.LENGTH_LONG).show()
            }
            return
        }

        val target = PrefsRepository.getTargetApp(this)
        val rawConfig = PrefsRepository.getRawConfig(this)
        if (target == null || rawConfig.isNullOrBlank()) {
            Toast.makeText(this, R.string.error_missing_setup, Toast.LENGTH_LONG).show()
            return
        }

        val prepareIntent = VpnService.prepare(this)
        if (prepareIntent != null) {
            vpnPermissionLauncher.launch(prepareIntent)
        } else {
            startVpn()
        }
    }

    private fun startVpn() {
        val target = PrefsRepository.getTargetApp(this) ?: return
        val rawConfig = PrefsRepository.getRawConfig(this) ?: return

        val config = try {
            VpnConfigBuilder.buildRestrictedConfig(rawConfig, target.packageName)
        } catch (e: Exception) {
            Toast.makeText(this, getString(R.string.error_invalid_config, e.message), Toast.LENGTH_LONG).show()
            return
        }

        VpnManager.connect(this, config) { e ->
            Toast.makeText(this, getString(R.string.error_connect, e.message), Toast.LENGTH_LONG).show()
        }
    }
}
