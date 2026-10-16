# PCPro

Herramienta de mantenimiento para Windows 10/11 en un solo script PowerShell, sin instalar nada.

| Módulo | Flag | Qué hace |
|---|---|---|
| Limpieza | `-Clean` | Temp, caché de Windows Update, miniaturas, shaders, WER, papelera, DISM component cleanup. `-IncludeBrowserCache` añade cachés de navegadores (nunca cookies/contraseñas). |
| Programas | `-Update` | `winget upgrade --all` (lista primero, actualiza con `-Apply`). |
| Drivers | `-Drivers` | Busca/instala drivers vía Windows Update, lista dispositivos con error. |
| Sin uso | `-Unused -UnusedDays 180` | Lista programas sin uso estimado y te deja elegir cuáles desinstalar (con confirmación individual). |
| Salud | `-Health` | SMART, programas de inicio, DISM/SFC, TRIM/desfragmentación. |

## Uso

1. Abre PowerShell **como Administrador** en la carpeta del script.
2. Primera vez: `Set-ExecutionPolicy -Scope Process Bypass`
3. **Simulación (no cambia nada):** `.\PCPro.ps1`
4. Ejecutar de verdad: `.\PCPro.ps1 -Apply -All` (o por módulos: `-Apply -Clean`, etc.)

Todo se registra en un `.log` en el Escritorio. Con `-Apply` se crea un punto de restauración antes (salvo `-NoRestorePoint`).

## Límites (leer)

- **Drivers de GPU, chipset y BIOS**: Windows Update suele traer versiones viejas. Usa NVIDIA App / AMD Adrenalin / Intel DSA / sitio del fabricante.
- **"Sin uso" es una estimación**: Windows no registra último uso. Se infiere de Prefetch (puede estar desactivado en SSD), último acceso del .exe y fecha de instalación. Revisa la lista antes de elegir.
- **No incluye limpiador de registro, a propósito**: no libera espacio medible y es una causa frecuente de roturas.
- Nunca se desinstala nada sin que tú elijas el ID y confirmes.
- El script no fue ejecutado en Windows al escribirlo: pruébalo primero en simulación.
