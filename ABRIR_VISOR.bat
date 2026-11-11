<# : ABRIR_VISOR.bat - abre el visor en el navegador con un servidor local (PowerShell de Windows; no instala nada)
@echo off
setlocal
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -Command "$f='%~f0'; iex ([IO.File]::ReadAllText($f))"
exit /b
#>
# El navegador no deja que una pagina abierta como archivo lea sus datos: por eso se sirve la carpeta en http://localhost.
$raiz = [IO.Path]::GetFullPath((Split-Path -Parent $f))
$listener = $null
foreach ($p in 8640..8660) {
  try {
    $l = New-Object System.Net.HttpListener
    $l.Prefixes.Add("http://localhost:$p/")
    $l.Start()
    $listener = $l; $puerto = $p; break
  } catch { }
}
if (-not $listener) { Write-Host 'No se pudo abrir un puerto local (8640 a 8660).'; Read-Host 'Enter para salir'; exit 1 }
$tipos = @{ '.html' = 'text/html; charset=utf-8'; '.js' = 'application/javascript; charset=utf-8'; '.css' = 'text/css; charset=utf-8';
  '.json' = 'application/json; charset=utf-8'; '.geojson' = 'application/geo+json; charset=utf-8'; '.pbf' = 'application/x-protobuf';
  '.webp' = 'image/webp'; '.png' = 'image/png'; '.jpg' = 'image/jpeg'; '.svg' = 'image/svg+xml'; '.txt' = 'text/plain; charset=utf-8' }
$url = "http://localhost:$puerto/"
Write-Host "Visor del acceso argentino al paso Las Lenas en $url"
Write-Host 'Para cerrarlo, cerrar esta ventana.'
if (-not $env:VISOR_SIN_NAVEGADOR) { Start-Process $url }
while ($listener.IsListening) {
  try {
    $ctx = $listener.GetContext()
    $resp = $ctx.Response
    $ruta = [Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath.TrimStart('/'))
    if ($ruta -eq '') { $ruta = 'index.html' }
    $archivo = [IO.Path]::GetFullPath((Join-Path $raiz $ruta))
    if ($archivo.StartsWith($raiz) -and (Test-Path -LiteralPath $archivo -PathType Leaf)) {
      $bytes = [IO.File]::ReadAllBytes($archivo)
      $ext = [IO.Path]::GetExtension($archivo).ToLower()
      if ($tipos.ContainsKey($ext)) { $resp.ContentType = $tipos[$ext] } else { $resp.ContentType = 'application/octet-stream' }
      $resp.ContentLength64 = $bytes.Length
      $resp.OutputStream.Write($bytes, 0, $bytes.Length)
    } else {
      $resp.StatusCode = 404
    }
    $resp.Close()
  } catch { }
}
