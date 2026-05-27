$WshShell = New-Object -ComObject WScript.Shell
$Desktop = [Environment]::GetFolderPath("Desktop")
$Shortcut = $WshShell.CreateShortcut("$Desktop\Storyboard Copilot.lnk")
$Shortcut.TargetPath = "D:\桌面\天元祈\天元一方\storyboard-copilot\src-tauri\target\debug\storyboard-copilot.exe"
$Shortcut.WorkingDirectory = "D:\桌面\天元祈\天元一方\storyboard-copilot"
$Shortcut.IconLocation = "D:\桌面\天元祈\天元一方\storyboard-copilot\src-tauri\icons\icon.ico,0"
$Shortcut.Description = "AI Storyboard Generator"
$Shortcut.Save()

Write-Host "Desktop shortcut created: $Desktop\Storyboard Copilot.lnk"
