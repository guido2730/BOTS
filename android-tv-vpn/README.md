# TV VPN (App objetivo)

App para Android TV que conecta una VPN WireGuard restringida a **una sola
app** ("app objetivo"). El resto de las apps del Android TV navegan
normalmente, fuera del túnel.

## Cómo funciona

- Elegís la app objetivo de la lista de apps instaladas.
- Pegás una configuración WireGuard (`.conf`, secciones `[Interface]` y
  `[Peer]`).
- Al conectar, la app reconstruye esa configuración agregando
  `IncludedApplications` con el paquete de la app objetivo (usando la API
  oficial `Interface.Builder.includeApplication`), así que **solo esa app**
  usa el túnel, sin importar lo que diga la config pegada.
- La conexión real la maneja la librería oficial de WireGuard para Android
  (`com.wireguard.android:tunnel`, `GoBackend`), no una implementación
  casera del protocolo.
- La clave privada del `.conf` se guarda cifrada con
  `EncryptedSharedPreferences` (androidx.security-crypto), no en texto
  plano.

## ¿De dónde saco un servidor WireGuard?

No conviene usar "VPNs públicas" sueltas de listas de internet: no sabés
quién opera esos servidores y pueden ver o interceptar todo tu tráfico.
Opciones razonables para conseguir una config WireGuard real:

- **ProtonVPN** (plan gratuito): creás una cuenta gratis y desde su web
  podés descargar una configuración WireGuard para los servidores
  incluidos en el free tier.
- **Windscribe** (plan gratuito): tiene un generador de configuraciones
  WireGuard en su sitio para cuentas gratuitas.
- Tu propio servidor WireGuard (por ejemplo un VPS tuyo con `wg-quick`).

Cualquiera de esas te da un archivo de texto con `[Interface]` (tu clave
privada, tu IP dentro del túnel) y `[Peer]` (clave pública del servidor,
`Endpoint`, `AllowedIPs`). Ese es el texto que pegás en la app.

## Compilar el APK

Este entorno de desarrollo no tiene el SDK de Android instalado, así que
el build real se hace en GitHub Actions:

1. Hacé push de este proyecto (o tocá cualquier archivo bajo
   `android-tv-vpn/`) a este repo.
2. En la pestaña **Actions** del repo, entrá al workflow
   **"Build Android TV VPN APK"** (se dispara solo con el push, o podés
   lanzarlo manualmente con "Run workflow").
3. Cuando termine, descargá el artifact `tv-vpn-debug-apk`: ahí está el
   `.apk` listo para instalar.

También podés abrir la carpeta `android-tv-vpn/` directamente en Android
Studio (Arctic Fox o más nuevo) y compilar/ejecutar desde ahí.

## Instalar en el Android TV

- Con `adb`: `adb connect <ip-del-tv>:5555 && adb install app-debug.apk`.
- O copiando el APK a un pendrive / usando una app como "Downloader" en el
  propio Android TV y abriendo el archivo.
- Tenés que habilitar "Orígenes desconocidos" / "Install unknown apps" en
  el Android TV para instalar un APK que no viene de una tienda.

## Notas de seguridad

- La app pide el permiso de VPN del sistema (`VpnService.prepare`) antes
  de conectar, como cualquier app VPN.
- Nunca compartas el archivo/config que pegás en la app: contiene tu clave
  privada de WireGuard.
- `minSdk` es 26 (Android 8.0), lo que cubre prácticamente cualquier
  Android TV / Google TV real.
