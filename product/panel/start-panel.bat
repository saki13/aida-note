@echo off
rem AidaPulse 工作流看板 - 一键启动脚本
rem 用法：双击本文件，或在命令行运行 start-panel.bat
chcp 65001 >nul
cd /d "%~dp0"
echo 正在启动 AidaPulse 工作流看板服务...
node serve.js
echo.
echo 服务已停止。
pause
