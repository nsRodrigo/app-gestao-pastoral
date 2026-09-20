@echo off
cd /d "%~dp0"

echo ===============================================
echo  Dizimo Conectado - encerrando ambiente local
echo ===============================================
echo.

echo Encerrando janelas da API e do Web (se abertas)...
taskkill /FI "WINDOWTITLE eq API - Dizimo Conectado" /T /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq WEB - Dizimo Conectado" /T /F >nul 2>&1

echo Parando o Postgres (dados preservados no volume Docker)...
docker compose down

echo.
echo Ambiente encerrado. Para apagar tambem os dados do banco, rode:
echo    docker compose down -v
echo.
pause
