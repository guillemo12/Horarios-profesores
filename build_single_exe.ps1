$ErrorActionPreference = "Stop"

$currentDir = Get-Location
$zipPath = Join-Path $currentDir "payload.zip"
$distDir = Join-Path $currentDir "dist\EduSchedule"
$outputExe = Join-Path $currentDir "EduSchedule_Unico.exe"

Write-Host "1. Comprimiendo paquete EduSchedule..."
if (Test-Path $zipPath) { Remove-Item $zipPath -Force }

Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::CreateFromDirectory($distDir, $zipPath)

Write-Host "2. Preparando código C# ejecutable..."
$sourceCode = @"
using System;
using System.IO;
using System.IO.Compression;
using System.Diagnostics;
using System.Reflection;
using System.Windows.Forms;

namespace EduScheduleSingle {
    class Program {
        [STAThread]
        static void Main(string[] args) {
            try {
                string localAppData = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
                string targetDir = Path.Combine(localAppData, "EduScheduleApp");
                string targetExe = Path.Combine(targetDir, "EduSchedule.exe");

                if (!File.Exists(targetExe)) {
                    if (Directory.Exists(targetDir)) {
                        try { Directory.Delete(targetDir, true); } catch {}
                    }
                    Directory.CreateDirectory(targetDir);

                    Assembly asm = Assembly.GetExecutingAssembly();
                    using (Stream stream = asm.GetManifestResourceStream("payload.zip")) {
                        if (stream != null) {
                            using (ZipArchive archive = new ZipArchive(stream)) {
                                archive.ExtractToDirectory(targetDir);
                            }
                        }
                    }
                }

                ProcessStartInfo psi = new ProcessStartInfo(targetExe);
                psi.WorkingDirectory = targetDir;
                Process.Start(psi);
            } catch (Exception ex) {
                MessageBox.Show("Error al iniciar EduSchedule: " + ex.Message, "EduSchedule", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }
    }
}
"@

$cscPath = "C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe"
if (Test-Path $outputExe) { Remove-Item $outputExe -Force }

Write-Host "3. Compilando ejecutable único EduSchedule_Unico.exe..."
$csFile = Join-Path $currentDir "Program.cs"
Set-Content -Path $csFile -Value $sourceCode -Encoding UTF8

$sysCompression = "C:\Windows\Microsoft.NET\Framework64\v4.0.30319\System.IO.Compression.dll"
$sysCompressionFs = "C:\Windows\Microsoft.NET\Framework64\v4.0.30319\System.IO.Compression.FileSystem.dll"

& $cscPath /target:winexe /out:"$outputExe" /resource:"$zipPath",payload.zip /reference:System.Windows.Forms.dll /reference:"$sysCompression" /reference:"$sysCompressionFs" "$csFile"

Remove-Item $csFile -Force
Remove-Item $zipPath -Force

Write-Host "✅ EduSchedule_Unico.exe creado con éxito!"
