@echo off
setlocal
cd /d "%~dp0.."

if exist "%CD%\mvnw.cmd" (
  call "%CD%\mvnw.cmd" -q -DskipTests compile exec:java -Dexec.mainClass="com.student52300082.networkproject.realtime.RealtimeCommServerFrame"
  goto :eof
)

where mvn >nul 2>nul
if %errorlevel%==0 (
  mvn -q -DskipTests compile exec:java -Dexec.mainClass="com.student52300082.networkproject.realtime.RealtimeCommServerFrame"
  goto :eof
)

echo [ERROR] Maven chua duoc cai dat hoac chua co trong PATH.
echo [HINT] Cai Maven va mo terminal moi, hoac tao mvnw.cmd trong thu muc source.
echo [HINT] Kiem tra bang lenh: mvn -v
endlocal
