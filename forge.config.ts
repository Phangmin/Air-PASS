import type { ForgeConfig } from '@electron-forge/shared-types';
import { MakerSquirrel } from '@electron-forge/maker-squirrel';
import { MakerZIP } from '@electron-forge/maker-zip';
import { MakerDeb } from '@electron-forge/maker-deb';
import { MakerRpm } from '@electron-forge/maker-rpm';
import { AutoUnpackNativesPlugin } from '@electron-forge/plugin-auto-unpack-natives';
import { VitePlugin } from '@electron-forge/plugin-vite';
import { FusesPlugin } from '@electron-forge/plugin-fuses';
import { FuseV1Options, FuseVersion } from '@electron/fuses';
import path from 'node:path';
import { cp, mkdir, rm } from 'node:fs/promises';

const runtimeModuleCopies = [
  {
    name: 'sqlite3',
    entries: ['package.json', 'LICENSE', 'README.md', 'lib', 'build/Release'],
  },
  {
    name: 'bindings',
    entries: ['package.json', 'bindings.js'],
  },
  {
    name: 'file-uri-to-path',
    entries: ['package.json', 'index.js', 'LICENSE'],
  },
] as const;

async function copyRuntimeModules(buildPath: string) {
  const appNodeModules = path.join(buildPath, 'node_modules');

  await mkdir(appNodeModules, { recursive: true });

  await Promise.all(
    runtimeModuleCopies.map(async ({ name, entries }) => {
      const destinationRoot = path.join(appNodeModules, name);
      await rm(destinationRoot, { recursive: true, force: true });
      await mkdir(destinationRoot, { recursive: true });

      await Promise.all(
        entries.map(async (entry) => {
          const source = path.resolve(__dirname, 'node_modules', name, entry);
          const destination = path.join(destinationRoot, entry);
          await cp(source, destination, { recursive: true });
        }),
      );
    }),
  );
}

const config: ForgeConfig = {
  packagerConfig: {
    asar: true,
    icon: 'src/assets/korea_gov_logo',
    extraResource: [
      path.resolve(__dirname, 'src', 'templates'),
      path.resolve(__dirname, 'src', 'assets'),
    ],
    afterPrune: [
      (buildPath, electronVersion, platform, arch, done) => {
        copyRuntimeModules(buildPath).then(() => done()).catch(done)
      },
    ],    
  },
  rebuildConfig: {
    onlyModules: ['sqlite3'],
  },
  makers: [
    new MakerSquirrel({
      name: 'air_pass',
      setupExe: 'Air-PASS-Setup.exe',
      setupIcon: path.resolve(__dirname, 'src', 'assets', 'korea_gov_logo.ico'),
    }),    
    new MakerZIP({}, ['darwin']),
    new MakerRpm({}),
    new MakerDeb({}),
  ],
  plugins: [
    new AutoUnpackNativesPlugin({}),
    new VitePlugin({
      // `build` can specify multiple entry builds, which can be Main process, Preload scripts, Worker process, etc.
      // If you are familiar with Vite configuration, it will look really familiar.
      build: [
        {
          // `entry` is just an alias for `build.lib.entry` in the corresponding file of `config`.
          entry: 'src/main.ts',
          config: 'vite.main.config.ts',
          target: 'main',
        },
        {
          entry: 'src/preload.ts',
          config: 'vite.preload.config.ts',
          target: 'preload',
        },
      ],
      renderer: [
        {
          name: 'main_window',
          config: 'vite.renderer.config.mts',
        },
      ],
    }),
    // Fuses are used to enable/disable various Electron functionality
    // at package time, before code signing the application
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
};

export default config;
