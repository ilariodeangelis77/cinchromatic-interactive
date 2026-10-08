$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$viewerUrl = 'https://html-classic.itch.zone/html/18447195/index.html'
$viewer = (Invoke-WebRequest -Uri $viewerUrl).Content
$images = [regex]::Matches($viewer, 'data:image/png;base64,([A-Za-z0-9+/=]+)')
if ($images.Count -ne 31) { throw "Expected 31 source images, got $($images.Count)" }
$tiles = [System.Collections.Generic.List[object]]::new()
$levels = [System.Collections.Generic.List[object]]::new()
$signatures = @{}
for ($index = 0; $index -lt $images.Count; $index++) {
    $bytes = [Convert]::FromBase64String($images[$index].Groups[1].Value)
    $stream = [System.IO.MemoryStream]::new($bytes, 0, $bytes.Length)
    $bitmap = [System.Drawing.Bitmap]::new($stream)
    $cells = [System.Collections.Generic.List[object]]::new()
    if ($index -gt 0) {
        if (($bitmap.Width - 2) % 5 -ne 0 -or ($bitmap.Height - 2) % 5 -ne 0) { throw "Image $index is not grid aligned" }
        for ($y = 1; $y -lt $bitmap.Height - 1; $y += 5) {
            for ($x = 1; $x -lt $bitmap.Width - 1; $x += 5) {
                $pixels = [System.Collections.Generic.List[string]]::new()
                for ($dy = 0; $dy -lt 5; $dy++) {
                    for ($dx = 0; $dx -lt 5; $dx++) {
                        $color = $bitmap.GetPixel($x + $dx, $y + $dy)
                        $pixels.Add(('{0:x2}{1:x2}{2:x2}' -f $color.R, $color.G, $color.B))
                    }
                }
                $signature = $pixels -join ''
                if (($pixels | Where-Object { $_ -ne '000000' }).Count -eq 0) { $cells.Add($null); continue }
                if (!$signatures.ContainsKey($signature)) {
                    $id = $tiles.Count
                    $signatures[$signature] = $id
                    $shape = ($pixels | ForEach-Object { if ($_ -eq '999999') { '.' } else { 'X' } }) -join ''
                    $character = $shape -eq '.XXX..XXX.XXXXX.XXX..X.X.'
                    $tiles.Add(@{ id = $id; pixels = @($pixels); character = $character; firstImage = $index })
                }
                $cells.Add($signatures[$signature])
            }
        }
    }
    $levels.Add(@{ index = $index; width = $bitmap.Width; height = $bitmap.Height; columns = $(if ($index -eq 0) { 0 } else { ($bitmap.Width - 2) / 5 }); rows = $(if ($index -eq 0) { 0 } else { ($bitmap.Height - 2) / 5 }); cells = @($cells); image = $images[$index].Value })
    $bitmap.Dispose()
    $stream.Dispose()
}
$data = @{ source = $viewerUrl; tiles = @($tiles); levels = @($levels) } | ConvertTo-Json -Depth 8 -Compress
$outputDirectory = Join-Path (Split-Path $PSScriptRoot -Parent) 'dist'
New-Item -ItemType Directory -Path $outputDirectory -Force | Out-Null
[System.IO.File]::WriteAllText((Join-Path $outputDirectory 'levels.js'), "// Original artwork: caveadventure and the Cinchromatic team. See Credits in the app.`nexport const SOURCE = $data;`n", [System.Text.UTF8Encoding]::new($false))
"Extracted $($levels.Count) images, $($tiles.Count) editable tiles, $(($tiles | Where-Object character).Count) character designs."
