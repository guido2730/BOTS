<#
.SYNOPSIS
  PCPro - limpieza, actualizacion de programas, desinstalacion de programas sin uso
  y actualizacion de drivers para Windows 10/11.

.DESCRIPTION
  Por defecto corre en MODO SIMULACION (no cambia nada). Agrega -Apply para ejecutar.
  Requiere PowerShell 5.1+ como Administrador.

.EXAMPLE
  .\PCPro.ps1                       # simulacion de todo, solo informa
  .\PCPro.ps1 -Apply -Clean         # limpia de verdad
  .\PCPro.ps1 -Apply -Update        # actualiza programas con winget
  .\PCPro.ps1 -Drivers              # lista drivers disponibles (Windows Update)
  .\PCPro.ps1 -Apply -Drivers       # instala drivers de Windows Update
  .\PCPro.ps1 -Unused -UnusedDays 180   # lista programas sin uso; -Apply para elegir cuales quitar
  .\PCPro.ps1 -Apply -All           # todo
#>
[CmdletBinding()]
param(
  [switch]$Apply,        # sin esto NADA se modifica
  [switch]$Clean,        # limpieza de archivos basura
  [switch]$Update,       # actualizar programas (winget)
  [switch]$Drivers,      # drivers via Windows Update
  [switch]$Unused,       # detectar/desinstalar programas sin uso
  [switch]$Health,       # DISM/SFC/chkdsk/TRIM + informe de arranque
  [switch]$All,
  [int]$UnusedDays = 180,
  [switch]$IncludeBrowserCache,   # cache de Chrome/Edge/Firefox/Brave (no toca contrasenas ni cookies)
  [switch]$NoRestorePoint
)

$ErrorActionPreference = 'Continue'
$script:Log = Join-Path $env:USERPROFILE ("Desktop\PCPro_{0:yyyyMMdd_HHmmss}.log" -f (Get-Date))
$script:FreedBytes = 0

if ($All) { $Clean = $Update = $Drivers = $Unused = $Health = $true }
if (-not ($Clean -or $Update -or $Drivers -or $Unused -or $Health)) { $Clean = $Update = $Drivers = $Unused = $Health = $true }

function Write-Log([string]$Msg, [string]$Color = 'Gray') {
  Write-Host $Msg -ForegroundColor $Color
  Add-Content -Path $script:Log -Value ("[{0:HH:mm:ss}] {1}" -f (Get-Date), $Msg)
}
function Section([string]$T) { Write-Log "`n=== $T ===" 'Cyan' }
function Fmt([long]$b) { if ($b -ge 1GB) { '{0:N2} GB' -f ($b/1GB) } elseif ($b -ge 1MB) { '{0:N1} MB' -f ($b/1MB) } else { '{0:N0} KB' -f ($b/1KB) } }

# ---------- Requisitos ----------
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) { Write-Host "Ejecuta PowerShell como Administrador." -ForegroundColor Red; exit 1 }

Write-Log ("PCPro | {0} | Modo: {1}" -f (Get-Date), $(if ($Apply) { 'EJECUCION REAL' } else { 'SIMULACION (usa -Apply para ejecutar)' })) 'Yellow'

# ---------- Punto de restauracion ----------
if ($Apply -and -not $NoRestorePoint) {
  Section 'Punto de restauracion'
  try {
    Enable-ComputerRestore -Drive "$env:SystemDrive\" -ErrorAction SilentlyContinue
    # Windows limita a 1 punto cada 24h por defecto; lo relajamos temporalmente
    $k = 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\SystemRestore'
    $old = (Get-ItemProperty $k -ErrorAction SilentlyContinue).SystemRestorePointCreationFrequency
    Set-ItemProperty $k -Name SystemRestorePointCreationFrequency -Value 0 -Type DWord -Force
    Checkpoint-Computer -Description 'PCPro antes de cambios' -RestorePointType MODIFY_SETTINGS -ErrorAction Stop
    if ($null -ne $old) { Set-ItemProperty $k -Name SystemRestorePointCreationFrequency -Value $old -Type DWord -Force }
    else { Remove-ItemProperty $k -Name SystemRestorePointCreationFrequency -ErrorAction SilentlyContinue }
    Write-Log 'Punto de restauracion creado.' 'Green'
  } catch { Write-Log "No se pudo crear punto de restauracion: $($_.Exception.Message)" 'Yellow' }
}

# =====================================================================
# 1. LIMPIEZA
# =====================================================================
function Get-DirSize($p) {
  if (-not (Test-Path $p)) { return 0 }
  (Get-ChildItem $p -Recurse -Force -File -ErrorAction SilentlyContinue | Measure-Object Length -Sum).Sum -as [long]
}

function Clear-Target($Name, $Path, [int]$OlderThanDays = 0) {
  if (-not (Test-Path $Path)) { return }
  $cut = (Get-Date).AddDays(-$OlderThanDays)
  $files = Get-ChildItem $Path -Recurse -Force -File -ErrorAction SilentlyContinue |
           Where-Object { $_.LastWriteTime -lt $cut }
  $size = ($files | Measure-Object Length -Sum).Sum -as [long]
  if (-not $size) { return }
  Write-Log ("  {0,-38} {1,10}" -f $Name, (Fmt $size))
  if ($Apply) {
    $files | Remove-Item -Force -ErrorAction SilentlyContinue
    # carpetas vacias
    Get-ChildItem $Path -Recurse -Force -Directory -ErrorAction SilentlyContinue |
      Sort-Object FullName -Descending |
      Where-Object { -not (Get-ChildItem $_.FullName -Force -ErrorAction SilentlyContinue) } |
      Remove-Item -Force -ErrorAction SilentlyContinue
  }
  $script:FreedBytes += $size
}

if ($Clean) {
  Section 'Limpieza de archivos basura'
  $u = $env:LOCALAPPDATA
  Clear-Target 'Temp del usuario (>2 dias)'        $env:TEMP 2
  Clear-Target 'Temp de Windows (>2 dias)'         "$env:SystemRoot\Temp" 2
  Clear-Target 'Cache Windows Update (descargas)'  "$env:SystemRoot\SoftwareDistribution\Download" 0
  Clear-Target 'Delivery Optimization'             "$env:SystemRoot\ServiceProfiles\NetworkService\AppData\Local\Microsoft\Windows\DeliveryOptimization\Cache" 0
  Clear-Target 'Informes de errores (WER)'         "$env:ProgramData\Microsoft\Windows\WER" 0
  Clear-Target 'Volcados de memoria'               "$env:SystemRoot\Minidump" 0
  Clear-Target 'Registros CBS antiguos (>30 d)'    "$env:SystemRoot\Logs\CBS" 30
  Clear-Target 'Prefetch (>60 d)'                  "$env:SystemRoot\Prefetch" 60
  Clear-Target 'Miniaturas (thumbcache)'           "$u\Microsoft\Windows\Explorer" 0
  Clear-Target 'Cache de shaders DirectX'          "$u\D3DSCache" 0
  Clear-Target 'Cache NVIDIA'                      "$u\NVIDIA\DXCache" 0
  Clear-Target 'Cache AMD'                         "$u\AMD\DxCache" 0
  Clear-Target 'Cache Teams (clasico)'             "$env:APPDATA\Microsoft\Teams\Cache" 0
  Clear-Target 'Cache Discord'                     "$env:APPDATA\discord\Cache" 0
  Clear-Target 'Cache Spotify'                     "$u\Spotify\Data" 0
  Clear-Target 'Descargas de Office (cache)'       "$u\Microsoft\Office\16.0\OfficeFileCache" 0

  if ($IncludeBrowserCache) {
    Write-Log '  (navegadores: solo cache, no cookies/contrasenas/historial)'
    Clear-Target 'Chrome cache'  "$u\Google\Chrome\User Data\Default\Cache" 0
    Clear-Target 'Chrome code cache' "$u\Google\Chrome\User Data\Default\Code Cache" 0
    Clear-Target 'Edge cache'    "$u\Microsoft\Edge\User Data\Default\Cache" 0
    Clear-Target 'Edge code cache' "$u\Microsoft\Edge\User Data\Default\Code Cache" 0
    Clear-Target 'Brave cache'   "$u\BraveSoftware\Brave-Browser\User Data\Default\Cache" 0
    Get-ChildItem "$u\Mozilla\Firefox\Profiles" -Directory -ErrorAction SilentlyContinue |
      ForEach-Object { Clear-Target "Firefox cache ($($_.Name))" (Join-Path $_.FullName 'cache2') 0 }
  }

  # Papelera
  try {
    $rb = (New-Object -ComObject Shell.Application).Namespace(0xA).Items()
    $rbSize = ($rb | ForEach-Object { $_.Size } | Measure-Object -Sum).Sum -as [long]
    if ($rbSize) {
      Write-Log ("  {0,-38} {1,10}" -f 'Papelera de reciclaje', (Fmt $rbSize))
      if ($Apply) { Clear-RecycleBin -Force -ErrorAction SilentlyContinue }
      $script:FreedBytes += $rbSize
    }
  } catch {}

  # Windows.old y componentes (solo informa; es lo que mas libera y mas riesgo tiene)
  if (Test-Path "$env:SystemDrive\Windows.old") {
    $wo = Get-DirSize "$env:SystemDrive\Windows.old"
    Write-Log ("  {0,-38} {1,10}  (usa Liberador de espacio > 'Instalaciones previas')" -f 'Windows.old', (Fmt $wo)) 'Yellow'
  }
  if ($Apply) {
    Write-Log '  Limpiando almacen de componentes (DISM)...'
    Dism.exe /Online /Cleanup-Image /StartComponentCleanup /Quiet | Out-Null
  }
  Write-Log ("`nEspacio {0}: {1}" -f $(if ($Apply) { 'liberado' } else { 'recuperable' }), (Fmt $script:FreedBytes)) 'Green'
}

# =====================================================================
# 2. ACTUALIZAR PROGRAMAS (winget)
# =====================================================================
if ($Update) {
  Section 'Actualizacion de programas (winget)'
  if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {
    Write-Log 'winget no esta instalado. Instala "App Installer" desde Microsoft Store.' 'Yellow'
  } else {
    winget source update 2>&1 | Out-Null
    Write-Log 'Programas con actualizacion disponible:'
    winget upgrade --accept-source-agreements 2>&1 | Tee-Object -FilePath $script:Log -Append
    if ($Apply) {
      Write-Log "`nActualizando todo..." 'Cyan'
      winget upgrade --all --silent --accept-package-agreements --accept-source-agreements --include-unknown 2>&1 |
        Tee-Object -FilePath $script:Log -Append
    }
  }
}

# =====================================================================
# 3. DRIVERS (via Windows Update; sin herramientas de terceros)
# =====================================================================
if ($Drivers) {
  Section 'Drivers (Windows Update)'
  try {
    $session  = New-Object -ComObject Microsoft.Update.Session
    $searcher = $session.CreateUpdateSearcher()
    Write-Log 'Buscando drivers... (puede tardar un par de minutos)'
    $result = $searcher.Search("IsInstalled=0 and Type='Driver'")
    if ($result.Updates.Count -eq 0) {
      Write-Log 'No hay drivers pendientes en Windows Update.' 'Green'
    } else {
      $i = 0
      foreach ($upd in $result.Updates) {
        $i++
        Write-Log ("  [{0}] {1}  ({2} MB)" -f $i, $upd.Title, [math]::Round($upd.MaxDownloadSize/1MB,1))
      }
      if ($Apply) {
        $coll = New-Object -ComObject Microsoft.Update.UpdateColl
        foreach ($upd in $result.Updates) {
          if (-not $upd.EulaAccepted) { $upd.AcceptEula() }
          [void]$coll.Add($upd)
        }
        $dl = $session.CreateUpdateDownloader(); $dl.Updates = $coll; [void]$dl.Download()
        $inst = $session.CreateUpdateInstaller(); $inst.Updates = $coll
        $r = $inst.Install()
        Write-Log ("Resultado instalacion drivers: codigo {0}. Reinicio requerido: {1}" -f $r.ResultCode, $r.RebootRequired) 'Green'
      } else {
        Write-Log '  (simulacion) Usa -Apply -Drivers para instalarlos.' 'Yellow'
      }
    }
  } catch { Write-Log "Error buscando drivers: $($_.Exception.Message)" 'Red' }

  Write-Log "`nDrivers con problemas actuales (Administrador de dispositivos):"
  $bad = Get-PnpDevice -PresentOnly -ErrorAction SilentlyContinue | Where-Object { $_.Status -in 'Error','Degraded','Unknown' }
  if ($bad) { $bad | ForEach-Object { Write-Log ("  ! {0} [{1}] {2}" -f $_.FriendlyName, $_.Class, $_.Status) 'Yellow' } }
  else { Write-Log '  Ninguno.' 'Green' }

  # PC de escritorio generica: GPU, chipset y BIOS dependen de la placa base y la tarjeta grafica
  Write-Log "`nHardware detectado (GPU, chipset y BIOS: Windows Update suele ir por detras):"
  $bb   = Get-CimInstance Win32_BaseBoard
  $bios = Get-CimInstance Win32_BIOS
  $cpu  = Get-CimInstance Win32_Processor | Select-Object -First 1
  Write-Log ("  Placa base : {0} {1}" -f $bb.Manufacturer, $bb.Product)
  Write-Log ("  BIOS       : {0} v{1} ({2:yyyy-MM-dd})" -f $bios.Manufacturer, $bios.SMBIOSBIOSVersion, $bios.ReleaseDate)
  Write-Log ("  CPU        : {0}" -f $cpu.Name.Trim())
  $gpus = Get-CimInstance Win32_VideoController | Where-Object { $_.Name -notmatch 'Basic|Remote|Virtual' }
  foreach ($g in $gpus) {
    Write-Log ("  GPU        : {0}  driver {1} ({2:yyyy-MM-dd})" -f $g.Name, $g.DriverVersion, $g.DriverDate)
  }

  $wg = Get-Command winget -ErrorAction SilentlyContinue
  foreach ($g in $gpus) {
    switch -Regex ($g.Name) {
      'NVIDIA' {
        Write-Log '  -> NVIDIA: usa NVIDIA App (winget id: Nvidia.NVIDIAApp). Instalacion "Driver Game Ready" o "Studio".' 'Yellow'
        if ($Apply -and $wg -and -not (winget list --id Nvidia.NVIDIAApp 2>$null | Select-String 'NVIDIAApp')) {
          winget install --id Nvidia.NVIDIAApp -e --silent --accept-package-agreements --accept-source-agreements
        }
      }
      'AMD|Radeon' { Write-Log '  -> AMD: descarga Adrenalin desde https://www.amd.com/en/support (autodetecta tu modelo).' 'Yellow' }
      'Intel'      {
        Write-Log '  -> Intel: Driver & Support Assistant (winget id: Intel.IntelDriverAndSupportAssistant).' 'Yellow'
        if ($Apply -and $wg -and -not (winget list --id Intel.IntelDriverAndSupportAssistant 2>$null | Select-String 'Intel')) {
          winget install --id Intel.IntelDriverAndSupportAssistant -e --silent --accept-package-agreements --accept-source-agreements
        }
      }
    }
  }
  $mb = $bb.Manufacturer
  $url = switch -Regex ($mb) {
    'ASUS'     { 'https://www.asus.com/support/download-center/' }
    'Micro-Star|MSI' { 'https://www.msi.com/support/download/' }
    'Gigabyte' { 'https://www.gigabyte.com/Support' }
    'ASRock'   { 'https://www.asrock.com/support/index.asp' }
    'Biostar'  { 'https://www.biostar.com.tw/app/en/support/download.php' }
    default    { $null }
  }
  if ($url) { Write-Log ("  -> Placa {0}: busca '{1}' en {2} (chipset, LAN, audio, BIOS)." -f $mb, $bb.Product, $url) 'Yellow' }
  else { Write-Log "  -> Busca '$($bb.Product)' en el sitio de $mb para chipset, LAN, audio y BIOS." 'Yellow' }
  if ($cpu.Name -match 'AMD|Ryzen') { Write-Log '  -> Chipset AMD: https://www.amd.com/en/support/download/drivers.html (Chipset).' 'Yellow' }
  Write-Log '  BIOS: NO se automatiza. Actualizala a mano, con corriente estable y solo si hay un fix que necesites.' 'Red'
}

# =====================================================================
# 4. PROGRAMAS SIN USO
# =====================================================================
if ($Unused) {
  Section "Programas sin uso aparente (> $UnusedDays dias)"
  Write-Log 'Nota: Windows NO guarda "ultimo uso" fiable. Se estima con Prefetch + ultimo acceso de .exe + fecha de instalacion.' 'Yellow'

  $regPaths = 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*',
              'HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*',
              'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*'
  $apps = Get-ItemProperty $regPaths -ErrorAction SilentlyContinue |
    Where-Object { $_.DisplayName -and -not $_.SystemComponent -and -not $_.ParentKeyName -and ($_.UninstallString -or $_.QuietUninstallString) } |
    Sort-Object DisplayName -Unique

  # ultimo uso por Prefetch (NOMBRE.EXE-HASH.pf)
  $pf = @{}
  Get-ChildItem "$env:SystemRoot\Prefetch\*.pf" -ErrorAction SilentlyContinue | ForEach-Object {
    $exe = ($_.BaseName -replace '-[0-9A-F]{8}$','').ToLower()
    if (-not $pf.ContainsKey($exe) -or $pf[$exe] -lt $_.LastWriteTime) { $pf[$exe] = $_.LastWriteTime }
  }

  $cut = (Get-Date).AddDays(-$UnusedDays)
  $cand = foreach ($a in $apps) {
    $last = $null
    $dir = $a.InstallLocation
    if ($dir -and (Test-Path $dir)) {
      Get-ChildItem $dir -Filter *.exe -Recurse -Depth 2 -ErrorAction SilentlyContinue | ForEach-Object {
        $n = $_.Name.ToLower()
        if ($pf.ContainsKey($n) -and ((-not $last) -or $pf[$n] -gt $last)) { $last = $pf[$n] }
        if ($_.LastAccessTime -gt (Get-Date '2001-01-01') -and ((-not $last) -or $_.LastAccessTime -gt $last)) { $last = $_.LastAccessTime }
      }
    }
    $inst = $null
    if ($a.InstallDate -match '^\d{8}$') { $inst = [datetime]::ParseExact($a.InstallDate,'yyyyMMdd',$null) }
    $ref = if ($last) { $last } else { $inst }
    if ($ref -and $ref -lt $cut) {
      [pscustomobject]@{
        Nombre = $a.DisplayName; Version = $a.DisplayVersion; Editor = $a.Publisher
        MB = [math]::Round(($a.EstimatedSize / 1024), 0); UltimoUso = $ref
        Fuente = if ($last) { 'uso' } else { 'instalacion' }
        Quiet = $a.QuietUninstallString; Uninst = $a.UninstallString
      }
    }
  }
  # fuera controladores, runtimes y componentes de sistema que NO se deben tocar
  $protect = 'Visual C\+\+','\.NET','Runtime','Redistributable','Driver','NVIDIA','AMD ','Intel\(R\)','Realtek','Microsoft Edge','WebView2','Windows','DirectX','Java'
  $cand = $cand | Where-Object { $n = $_.Nombre; -not ($protect | Where-Object { $n -match $_ }) } | Sort-Object MB -Descending

  if (-not $cand) { Write-Log 'Nada que listar.' 'Green' }
  else {
    $i = 0
    $cand | ForEach-Object { $i++; $_ | Add-Member -NotePropertyName Id -NotePropertyValue $i -Force }
    $cand | Format-Table Id, Nombre, Version, MB, @{n='UltimoUso';e={$_.UltimoUso.ToString('yyyy-MM-dd')}}, Fuente -AutoSize | Out-String | ForEach-Object { Write-Log $_ }

    if ($Apply) {
      $sel = Read-Host 'IDs a desinstalar separados por coma (ej: 1,4,7) o ENTER para ninguno'
      foreach ($id in ($sel -split ',' | ForEach-Object { $_.Trim() } | Where-Object { $_ -match '^\d+$' })) {
        $app = $cand | Where-Object Id -eq ([int]$id)
        if (-not $app) { continue }
        if ((Read-Host "Desinstalar '$($app.Nombre)'? (s/N)") -ne 's') { continue }
        Write-Log "Desinstalando $($app.Nombre)..." 'Cyan'
        try {
          $cmd = if ($app.Quiet) { $app.Quiet } else { $app.Uninst }
          if ($cmd -match 'msiexec' -and -not $app.Quiet) { $cmd = ($cmd -replace '/I','/X') + ' /qn /norestart' }
          Start-Process cmd.exe -ArgumentList "/c $cmd" -Wait
          Write-Log '  Listo.' 'Green'
        } catch { Write-Log "  Fallo: $($_.Exception.Message)" 'Red' }
      }
    } else {
      Write-Log '(simulacion) Usa -Apply -Unused para elegir cuales desinstalar.' 'Yellow'
    }
  }

  # Apps de la Tienda: solo listar, nunca borrar automaticamente
  Write-Log "`nApps de Microsoft Store instaladas (revisa manualmente, no se borran solas):"
  Get-AppxPackage -ErrorAction SilentlyContinue | Where-Object { -not $_.IsFramework -and $_.SignatureKind -eq 'Store' } |
    Sort-Object Name | ForEach-Object { Write-Log ("  {0}" -f $_.Name) }
}

# =====================================================================
# 5. SALUD DEL SISTEMA
# =====================================================================
if ($Health) {
  Section 'Salud del sistema'
  $d = Get-PSDrive -Name $env:SystemDrive[0]
  Write-Log ("Disco {0}: libre {1} de {2}" -f $d.Name, (Fmt $d.Free), (Fmt ($d.Used + $d.Free)))

  Write-Log "`nProgramas de inicio (desactiva los que no necesites en Administrador de tareas > Inicio):"
  Get-CimInstance Win32_StartupCommand -ErrorAction SilentlyContinue |
    Sort-Object Name | ForEach-Object { Write-Log ("  {0,-30} {1}" -f $_.Name, $_.Command) }

  Write-Log "`nSalud de discos (SMART):"
  Get-PhysicalDisk -ErrorAction SilentlyContinue | ForEach-Object {
    Write-Log ("  {0}  {1}  Salud: {2}" -f $_.FriendlyName, $_.MediaType, $_.HealthStatus) $(if ($_.HealthStatus -eq 'Healthy') { 'Green' } else { 'Red' })
  }

  if ($Apply) {
    Write-Log "`nDISM RestoreHealth..." 'Cyan'; DISM.exe /Online /Cleanup-Image /RestoreHealth | Out-Null
    Write-Log 'SFC /scannow...' 'Cyan';       sfc.exe /scannow | Out-Null
    Write-Log 'Optimizando unidades (TRIM en SSD, desfragmentar en HDD)...' 'Cyan'
    Get-Volume | Where-Object { $_.DriveLetter -and $_.DriveType -eq 'Fixed' } |
      ForEach-Object { Optimize-Volume -DriveLetter $_.DriveLetter -ErrorAction SilentlyContinue }
    Write-Log 'Hecho. Revisa C:\Windows\Logs\CBS\CBS.log si SFC reporto problemas.' 'Green'
  } else {
    Write-Log "`n(simulacion) Con -Apply -Health: DISM RestoreHealth, SFC, TRIM/desfragmentacion." 'Yellow'
  }
}

Write-Log "`nLog guardado en: $script:Log" 'Cyan'
