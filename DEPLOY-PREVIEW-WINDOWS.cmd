@echo off
setlocal
cd /d "%~dp0"

echo =========================================
echo German Library v3.2.1 - Vercel PREVIEW
 echo =========================================
echo This deploys a PREVIEW only, not production.
echo No Supabase database migrations are executed.
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo ERROR: Node.js 20+ is required. Install it from nodejs.org first.
  pause
  exit /b 1
)

echo Linking to your existing Vercel project german-library...
call npx --yes vercel@latest link --yes --project german-library --scope iktx420cyber-9788
if errorlevel 1 (
  echo.
  echo If you are not signed in, run: npx vercel@latest login
  echo Then run this script again.
  pause
  exit /b 1
)

echo Deploying this extracted v3.2.1 folder to Preview...
call npx --yes vercel@latest deploy --yes
if errorlevel 1 (
  echo.
  echo Deployment failed. Check the error above. Existing production remains unchanged.
  pause
  exit /b 1
)

echo.
echo Deployment command succeeded. Check the deployment URL and test it.
echo Do NOT promote until required Supabase migrations and live security checks pass.
pause
