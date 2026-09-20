@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"

echo ===============================================
echo  Dizimo Conectado - subindo ambiente local
echo ===============================================
echo.

echo [1/10] Encerrando instancias anteriores da API/Web (se houver)...
taskkill /FI "WINDOWTITLE eq API - Dizimo Conectado" /T /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq WEB - Dizimo Conectado" /T /F >nul 2>&1
for %%P in (3000 3001) do (
  for /f "tokens=5" %%A in ('netstat -ano ^| findstr ":%%P " ^| findstr LISTENING') do (
    taskkill /PID %%A /F >nul 2>&1
  )
)
timeout /t 1 /nobreak >nul

echo [2/10] Verificando Docker...
docker info >nul 2>&1
if errorlevel 1 (
  echo [ERRO] Docker Desktop nao esta rodando ou nao esta instalado.
  echo        Abra o Docker Desktop, espere o status "Engine running" e tente de novo.
  goto :error
)

echo [3/10] Instalando dependencias (pnpm install)...
call pnpm install --frozen-lockfile
if errorlevel 1 goto :error

echo [4/10] Subindo o Postgres (docker compose)...
docker compose up -d postgres
if errorlevel 1 goto :error

echo [5/10] Conferindo arquivos de ambiente (.env)...
if not exist "apps\api\.env" (
  copy "apps\api\.env.example" "apps\api\.env" >nul
  echo    Criado apps\api\.env
)
if not exist "apps\web\.env.local" (
  copy "apps\web\.env.local.example" "apps\web\.env.local" >nul
  echo    Criado apps\web\.env.local
)

echo [6/10] Build do pacote compartilhado...
call pnpm --filter "@gestao-pastoral/shared" build
if errorlevel 1 goto :error

echo [7/10] Gerando Prisma Client...
call pnpm --filter "@gestao-pastoral/api" prisma:generate
if errorlevel 1 goto :error

echo [8/10] Aguardando Postgres aceitar conexoes...
:waitpg
docker exec gestao-pastoral-postgres pg_isready -U postgres >nul 2>&1
if errorlevel 1 (
  timeout /t 2 /nobreak >nul
  goto :waitpg
)

echo [9/10] Aplicando migrations e seed...
call pnpm --filter "@gestao-pastoral/api" prisma:migrate
if errorlevel 1 goto :error
call pnpm --filter "@gestao-pastoral/api" prisma:seed
if errorlevel 1 goto :error

echo [10/10] Subindo API e Web em janelas separadas...
start "API - Dizimo Conectado" cmd /k "pnpm --filter @gestao-pastoral/api dev"
start "WEB - Dizimo Conectado" cmd /k "pnpm --filter @gestao-pastoral/web dev"

echo.
echo ===============================================
echo  Ambiente no ar!
echo  API:  http://localhost:3001/api
echo  WEB:  http://localhost:3000
echo.
echo  Login de teste (senha: SenhaForte123):
echo    paroco@nsgruta.org.br
echo    tesoureiro@nsgruta.org.br
echo    secretaria@nsgruta.org.br
echo.
echo  Para encerrar tudo, rode dev-down.bat
echo ===============================================
pause
exit /b 0

:error
echo.
echo [ERRO] Falha em uma das etapas acima. Corrija e rode o script novamente.
pause
exit /b 1
