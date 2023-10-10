import Debug from '@prisma/debug'
import { getNodeAPIName, Platform } from '@prisma/get-platform'
import findCacheDir from 'find-cache-dir'
import fs from 'fs'
import { ensureDir } from 'fs-extra'
import os from 'os'
import path from 'path'

import { BinaryType } from './BinaryType'

const debug = Debug('prisma:fetch-engine:cache-dir')

export async function getRootCacheDir(): Promise<string | null> {
  if (os.platform() === 'win32') {
    const cacheDir = findCacheDir({ name: 'prisma', create: true })
    if (cacheDir) {
      return cacheDir
    }
    if (process.env.APPDATA) {
      return path.join(process.env.APPDATA, 'Prisma')
    }
  }
  // if this is lambda, nope
  if (process.env.AWS_LAMBDA_FUNCTION_VERSION) {
    try {
      await ensureDir(`/tmp/prisma-download`)
      return `/tmp/prisma-download`
    } catch (e) {
      return null
    }
  }
  return path.join(os.homedir(), '.cache/prisma')
}

export async function getCacheDir(channel: string, version: string, platform: string): Promise<string | null> {
  const rootCacheDir = await getRootCacheDir()
  if (!rootCacheDir) {
    return null
  }
  const cacheDir = path.join(rootCacheDir, channel, version, platform)
  try {
    if (!fs.existsSync(cacheDir)) {
      await ensureDir(cacheDir)
    }
  } catch (e) {
    debug('The following error is being caught and just there for debugging:')
    debug(e)
    return null
  }
  return cacheDir
}

export function getDownloadUrl({
  channel,
  version,
  platform,
  binaryName,
  extension = '.gz',
}: {
  channel: string
  version: string
  platform: Platform
  binaryName: string
  extension?: string
}): string {
  const baseUrl =
    process.env.PRISMA_BINARIES_MIRROR || // TODO: remove this
    process.env.PRISMA_ENGINES_MIRROR ||
    'https://binaries.prisma.sh'
  const finalExtension =
    platform === 'windows' && BinaryType.QueryEngineLibrary !== binaryName ? `.exe${extension}` : extension
  if (binaryName === BinaryType.QueryEngineLibrary) {
    binaryName = getNodeAPIName(platform, 'url')
  }

  return `${baseUrl}/${channel}/${version}/${platform}/${binaryName}${finalExtension}`
}

export async function overwriteFile(sourcePath: string, targetPath: string) {
  // without removing the file first,
  // macOS Gatekeeper can sometimes complain
  // about incorrect binary signature and kill node process
  // https://openradar.appspot.com/FB8914243
  if (os.platform() === 'darwin') {
    await removeFileIfExists(targetPath)
  }
  await fs.promises.copyFile(sourcePath, targetPath)
}

async function removeFileIfExists(filePath: string) {
  try {
    await fs.promises.unlink(filePath)
  } catch (e) {
    if (e.code !== 'ENOENT') {
      throw e
    }
  }
}
