package com.guido2730.tvvpn

import android.os.Bundle
import android.widget.Button
import android.widget.EditText
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import com.wireguard.config.Config
import java.io.BufferedReader
import java.io.StringReader

class VpnConfigActivity : AppCompatActivity() {

    private lateinit var etConfig: EditText

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_vpn_config)

        etConfig = findViewById(R.id.etConfigText)
        etConfig.setText(PrefsRepository.getRawConfig(this).orEmpty())

        findViewById<Button>(R.id.btnSaveConfig).setOnClickListener { saveConfig() }
        findViewById<Button>(R.id.btnCancel).setOnClickListener { finish() }
    }

    private fun saveConfig() {
        val text = etConfig.text.toString()
        if (text.isBlank()) {
            Toast.makeText(this, R.string.error_empty_config, Toast.LENGTH_LONG).show()
            return
        }

        try {
            Config.parse(BufferedReader(StringReader(text)))
        } catch (e: Exception) {
            Toast.makeText(this, getString(R.string.error_invalid_config, e.message), Toast.LENGTH_LONG).show()
            return
        }

        PrefsRepository.setRawConfig(this, text)
        setResult(RESULT_OK)
        Toast.makeText(this, R.string.config_saved, Toast.LENGTH_SHORT).show()
        finish()
    }
}
