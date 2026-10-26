#!/usr/bin/env node
/**
 * Wire this plugin into the desktop profile.
 *
 *   node install.mjs            # create the junction + add the loader insert
 *   node install.mjs --remove   # undo both
 *
 * DSH resolves plugins by package name from the profile's node_modules, so a
 * junction is enough to make the source tree in this workspace visible to it;
 * the profile patch then tells the loader to instantiate the plugin.
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const PKG_NAME = 'dsh-session-artifacts'
const PLUGIN_ID = 'session-artifacts'

const DSH_HOME = process.env.DSH_HOME || path.join(os.homedir(), '.dsh')
const PROFILE = path.join(DSH_HOME, 'profiles', 'desktop')
const PATCH_FILE = path.join(PROFILE, 'cordis.patch.yml')
const LINK = path.join(PROFILE, 'node_modules', PKG_NAME)

const INSERT_BLOCK = ['- insert:', `    - id: ${PLUGIN_ID}`, `      name: ${PKG_NAME}`].join('\n')

const remove = process.argv.includes('--remove')

function log(message) {
  console.log(`[${PKG_NAME}] ${message}`)
}

function fail(message) {
  console.error(`[${PKG_NAME}] ${message}`)
  process.exit(1)
}

if (!fs.existsSync(path.join(PROFILE, 'package.json'))) {
  fail(`profile not found at ${PROFILE} — is this a desktop install of DSH?`)
}

/* ---------------------------------------------------------------- junction */

const linkExists = fs.existsSync(LINK) || isBrokenLink(LINK)

function isBrokenLink(p) {
  try {
    fs.lstatSync(p)
    return !fs.existsSync(p)
  } catch {
    return false
  }
}

function createJunction(from, to) {
  fs.symlinkSync(to, from, 'junction')
}

if (remove) {
  if (linkExists) {
    fs.rmSync(LINK, { recursive: true, force: true })
    log(`removed junction ${LINK}`)
  } else {
    log('no junction to remove')
  }
} else if (linkExists) {
  let current = ''
  try {
    current = fs.realpathSync.native(LINK)
  } catch {
    current = ''
  }
  const same =
    current !== '' &&
    path.resolve(current).toLowerCase() === path.resolve(HERE).toLowerCase()
  if (same) {
    log(`junction already present → ${LINK}`)
  } else {
    // Never repoint silently: replacing a junction by force risks touching the
    // copy it currently points at. Ask instead.
    log(`junction already points at ${current || '(unreadable target)'}, this copy is ${HERE}`)
    fail('run `node install.mjs --remove` first, then run install.mjs from the copy DSH should load')
  }
} else {
  createJunction(LINK, HERE)
  log(`created junction ${LINK} → ${HERE}`)
}

/* ------------------------------------------------------------- profile patch */

if (!fs.existsSync(PATCH_FILE)) fail(`missing ${PATCH_FILE}`)
const original = fs.readFileSync(PATCH_FILE, 'utf8')
let text = original

// Drop any previous block for this plugin so re-running stays idempotent.
const blockPattern = /^[ \t]*- insert:\n(?:[ \t]+.*\n)*?[ \t]+- id: session-artifacts\n[ \t]+name: dsh-session-artifacts\n/m
if (blockPattern.test(text)) {
  text = text.replace(blockPattern, '')
  log('removed the previous insert block')
}

if (!remove) {
  const trimmed = text.replace(/\s*$/, '')
  text = `${trimmed}\n${INSERT_BLOCK}\n`
}

if (text === original) {
  log('profile patch unchanged')
} else {
  const backup = `${PATCH_FILE}.bak-${Date.now()}`
  fs.copyFileSync(PATCH_FILE, backup)
  fs.writeFileSync(PATCH_FILE, text, 'utf8')
  log(`profile patch updated (backup: ${path.basename(backup)})`)
}

if (remove) {
  log('done. restart DSH for the tab to disappear.')
} else {
  log('done. RESTART DSH — the host half registers its routes at startup.')
  log('after restart, look for the 「本会话产物」 tab in the sidebar.')
}
