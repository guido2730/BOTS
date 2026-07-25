package com.guido2730.tvvpn

import android.content.Intent
import android.content.pm.PackageManager
import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView

class AppPickerActivity : AppCompatActivity() {

    companion object {
        const val EXTRA_PACKAGE_NAME = "extra_package_name"
        const val EXTRA_LABEL = "extra_label"
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_app_picker)

        val apps = loadLaunchableApps()

        val recyclerView = findViewById<RecyclerView>(R.id.rvApps)
        recyclerView.layoutManager = LinearLayoutManager(this)
        recyclerView.adapter = AppListAdapter(apps) { app ->
            val result = Intent()
            result.putExtra(EXTRA_PACKAGE_NAME, app.packageName)
            result.putExtra(EXTRA_LABEL, app.label)
            setResult(RESULT_OK, result)
            finish()
        }

        recyclerView.post {
            recyclerView.getChildAt(0)?.requestFocus()
        }
    }

    private fun loadLaunchableApps(): List<InstalledApp> {
        val pm = packageManager
        val ownPackage = packageName
        val seen = LinkedHashMap<String, InstalledApp>()

        val categories = listOf(Intent.CATEGORY_LEANBACK_LAUNCHER, Intent.CATEGORY_LAUNCHER)
        for (category in categories) {
            val intent = Intent(Intent.ACTION_MAIN).addCategory(category)
            val resolved = try {
                pm.queryIntentActivities(intent, PackageManager.MATCH_DEFAULT_ONLY)
            } catch (e: Exception) {
                emptyList()
            }
            for (info in resolved) {
                val pkg = info.activityInfo.packageName
                if (pkg == ownPackage || seen.containsKey(pkg)) continue
                val label = info.loadLabel(pm).toString()
                val icon = try {
                    info.loadIcon(pm)
                } catch (e: Exception) {
                    null
                }
                seen[pkg] = InstalledApp(pkg, label, icon)
            }
        }

        return seen.values.sortedBy { it.label.lowercase() }
    }
}
