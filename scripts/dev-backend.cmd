@echo off
rem SmartScan Stay - short launcher shim for cmd.exe / Explorer / PATH.
rem Usage: dev-backend.cmd [-Port 9000] [-BindHost 0.0.0.0] [-NoReload]
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0dev-backend.ps1" %*
