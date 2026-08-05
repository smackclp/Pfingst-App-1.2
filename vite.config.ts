import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { execSync } from 'child_process';
import {defineConfig} from 'vite';

// Datum/Uhrzeit + Kurz-Hash des letzten Git-Commits, um im Header anzeigen zu
// können, wann die Programmierung zuletzt geändert wurde (nicht die Daten).
// Fällt auf den Build-Zeitpunkt zurück, falls kein Git-Verlauf verfügbar ist
// (z.B. in manchen gehosteten Build-Umgebungen ohne .git-Ordner).
function getLastCommitInfo() {
  try {
    const date = execSync('git log -1 --format=%cI').toString().trim();
    const hash = execSync('git log -1 --format=%h').toString().trim();
    return { date, hash };
  } catch {
    return { date: new Date().toISOString(), hash: 'unknown' };
  }
}

export default defineConfig(() => {
  const { date: lastCommitDate, hash: lastCommitHash } = getLastCommitInfo();

  return {
    plugins: [react(), tailwindcss()],
    define: {
      __LAST_COMMIT_DATE__: JSON.stringify(lastCommitDate),
      __LAST_COMMIT_HASH__: JSON.stringify(lastCommitHash),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
