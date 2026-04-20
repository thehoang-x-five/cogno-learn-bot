@echo off
setlocal
set ROOT=%~dp0..
set SRC=%ROOT%\src\main\java
set OUT=%ROOT%\artifacts\classes
if not exist "%OUT%" mkdir "%OUT%"
dir /s /b "%SRC%\*.java" > "%ROOT%\artifacts\sources.list"
javac -encoding UTF-8 -d "%OUT%" @"%ROOT%\artifacts\sources.list"
if errorlevel 1 exit /b 1
java -cp "%OUT%" com.student52300082.networkproject.realtime.RealtimeCommServerFrame
