package com.guido2730.tvvpn

import android.content.Context
import android.content.SharedPreferences
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey

/**
 * Plain prefs hold only the (non-secret) target app selection.
 * The raw WireGuard config text contains a private key, so it lives in
 * EncryptedSharedPreferences instead.
 */
object PrefsRepository {

    private const val PLAIN_PREFS = "tvvpn_plain_prefs"
    private const val SECURE_PREFS = "tvvpn_secure_prefs"

    private const val KEY_TARGET_PACKAGE = "target_package"
    private const val KEY_TARGET_LABEL = "target_label"
    private const val KEY_RAW_CONFIG = "raw_wireguard_config"

    data class TargetApp(val packageName: String, val label: String)

    private fun plainPrefs(context: Context): SharedPreferences =
        context.applicationContext.getSharedPreferences(PLAIN_PREFS, Context.MODE_PRIVATE)

    private fun securePrefs(context: Context): SharedPreferences {
        val appContext = context.applicationContext
        val masterKey = MasterKey.Builder(appContext)
            .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
            .build()
        return EncryptedSharedPreferences.create(
            appContext,
            SECURE_PREFS,
            masterKey,
            EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
            EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
        )
    }

    fun getTargetApp(context: Context): TargetApp? {
        val prefs = plainPrefs(context)
        val pkg = prefs.getString(KEY_TARGET_PACKAGE, null) ?: return null
        val label = prefs.getString(KEY_TARGET_LABEL, pkg) ?: pkg
        return TargetApp(pkg, label)
    }

    fun setTargetApp(context: Context, packageName: String, label: String) {
        plainPrefs(context).edit()
            .putString(KEY_TARGET_PACKAGE, packageName)
            .putString(KEY_TARGET_LABEL, label)
            .apply()
    }

    fun getRawConfig(context: Context): String? =
        securePrefs(context).getString(KEY_RAW_CONFIG, null)

    fun setRawConfig(context: Context, rawConfig: String) {
        securePrefs(context).edit().putString(KEY_RAW_CONFIG, rawConfig).apply()
    }

    fun hasConfig(context: Context): Boolean = !getRawConfig(context).isNullOrBlank()
}
