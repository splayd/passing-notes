/* eslint-disable flowtype/no-weak-types */
/* @flow */
import { start, stop, writeFile } from 'passing-notes/test/helpers'
import * as withBrowser from 'passing-notes/test/fixtures/with-browser'
import * as withProject from 'passing-notes/test/fixtures/with-project'
import { openTab, evalInTab } from 'puppet-strings'

export default async function(moduleContents: string): Promise<any> {
  const project = await withProject.setup()
  try {
    await writeFile(
      project.directory,
      'server.js',
      `
      import { flow } from 'lodash'
      import { liftResponder } from 'passing-notes/lib/http'
      import { serveUi } from 'passing-notes/lib/middleware/server'

      export default flow([
        serveUi('index.html'),
        liftResponder
      ])(() => {
        throw new Error('Unexpected request')
      })
    `
    )

    await writeFile(
      project.directory,
      'index.html',
      `
      <!doctype html>
      <meta charset="utf-8">
      <script async src="index.js"></script>
      `
    )

    await writeFile(project.directory, 'user-module.js', moduleContents)

    await writeFile(
      project.directory,
      'index.js',
      `
      import fn from './user-module'
      window.fn = fn
      `
    )

    const server = await start(['yarn', 'pass-notes', 'server.js'], {
      cwd: project.directory,
      env: { PORT: '20000' },
      waitForOutput: 'Listening'
    })
    const browser = await withBrowser.setup()
    try {
      const tab = await openTab(browser, 'http://localhost:20000')
      return await evalInTab(tab, [], 'return window.fn()')
    } finally {
      await withBrowser.teardown(browser)
      await stop(server)
    }
  } finally {
    await withProject.teardown(project)
  }
}
