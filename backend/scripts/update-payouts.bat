@echo off
REM Stripe Payout Configuration Script for Windows
REM Updates all connected accounts to monthly payouts on the 1st

echo.
echo ========================================
echo   Stripe Payout Configuration
echo ========================================
echo.
echo Setting all accounts to: Monthly payouts on the 1st
echo.

REM Check if Stripe CLI is installed
where stripe >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Stripe CLI not found!
    echo Please install it from: https://stripe.com/docs/stripe-cli
    pause
    exit /b 1
)

echo Fetching connected accounts...
echo.

REM Get list of account IDs
for /f "tokens=2" %%a in ('stripe accounts list --limit 100 ^| findstr "id:"') do (
    echo Updating account: %%a
    stripe accounts update %%a --settings.payouts.schedule.interval=monthly --settings.payouts.schedule.monthly_anchor=1 --settings.payouts.schedule.delay_days=minimum >nul 2>&1
    if %ERRORLEVEL% EQU 0 (
        echo    SUCCESS
    ) else (
        echo    FAILED
    )
    echo.
)

echo.
echo ========================================
echo   Done!
echo ========================================
echo.
pause
