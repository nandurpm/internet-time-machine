@echo off
REM ============================================================
REM FILE: run-local.cmd
REM PURPOSE: Provides the Windows command launcher that forwards local commands to Internet Time Machine's Node.js entry point.
REM ============================================================

node scripts\run-local.mjs dev %*
