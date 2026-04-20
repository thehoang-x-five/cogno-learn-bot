@echo off
setlocal
cd /d "%~dp0.."
mvn -q -DskipTests compile exec:java -Dexec.mainClass="com.student52300082.networkproject.realtime.RealtimeCommServerFrame"
endlocal
