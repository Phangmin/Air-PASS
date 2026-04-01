import { app } from 'electron'
import path from 'node:path'

export function getResourceAssetPath(fileName: string) {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'assets', fileName)
  }

  return path.join(app.getAppPath(), 'src', 'assets', fileName)
}
