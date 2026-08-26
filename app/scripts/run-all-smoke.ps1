# 全量回归运行器（OPT-2/OPT-3 验证用，收口后保留为通用回归工具）
# 用法：Start-Process powershell -ArgumentList '-File scripts/run-all-smoke.ps1'（脱离沙箱存活）
$ErrorActionPreference = "Continue"
$scripts = @("ui-smoke","multitab-smoke","wysiwyg-smoke","mermaid-smoke","format-smoke","search-smoke","wrap-smoke","compare-smoke","theme-smoke","recent-smoke","draft-smoke","ai-smoke","ai-mermaid-smoke","opt3-bg-smoke","opt5-brief-smoke","opt6-session-smoke","opt8-translate-smoke")
$results = @()
foreach ($s in $scripts) {
  try {
    & node ("scripts/" + $s + ".mjs") *>> "regression.log"
    $code = $LASTEXITCODE
  } catch {
    # node 未启动/脚本异常（非脚本自身退出码）：记 98
    $_ | Out-String | Out-File "regression-err.txt" -Append -Encoding utf8
    $code = 98
  }
  if ($null -eq $code) { $code = 1 }
  $results += ("$s=$code")
}
$results | Out-File "regression-summary.txt" -Encoding utf8
Write-Output ("DONE: " + ($results -join " ")) | Out-File "regression-done.txt" -Encoding utf8
