const assert = require('node:assert/strict')
const { spawn } = require('node:child_process')
const { once } = require('node:events')
const { readFileSync } = require('node:fs')
const path = require('node:path')
const { setTimeout: delay } = require('node:timers/promises')
const { randomUUID } = require('node:crypto')

const root = path.resolve(__dirname, '..')
const base = 'http://127.0.0.1:3100'
const backendFiles = ['src/server/board.ts', 'src/app/api/posts/route.ts', 'src/app/api/posts/[id]/route.ts']
const originalBackend = backendFiles.map((file) => readFileSync(path.join(root, file)))
let child
let output = ''
let created
let otherCreated
const pagingCreated = []

async function start(apiBase) {
  output = ''
  child = spawn(process.execPath, [path.join(root, 'node_modules/next/dist/bin/next'), 'start', '--hostname', '127.0.0.1', '--port', '3100'], {
    cwd: root, env: { ...process.env, API_BASE_URL: apiBase }, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
  })
  child.stdout.on('data', (data) => { output = (output + data).slice(-4000) })
  child.stderr.on('data', (data) => { output = (output + data).slice(-4000) })
  for (let attempt = 0; attempt < 80; attempt++) {
    if (child.exitCode !== null) throw new Error(`Server exited: ${output}`)
    if (output.includes('Ready in')) return
    await delay(250)
  }
  throw new Error(`Server did not start: ${output}`)
}

async function stop() {
  if (child && child.exitCode === null) {
    const closed = once(child, 'exit')
    child.kill()
    await closed
  }
  child = undefined
}

async function fetchLocal(route, options = {}) {
  return fetch(base + route, { ...options, signal: AbortSignal.timeout(15000) })
}

async function run() {
  try {
    await start(base)
    const initial = await (await fetchLocal('/api/posts')).json()
    const initialHtml = await (await fetchLocal('/posts')).text()
    assert.match(initialHtml, /모두의 이야기/)
    if (initial.total === 0) assert.match(initialHtml, /아직 이야기가 없어요/)
    console.log('PASS: server-rendered list and initial data state')

    const title = `Integration check ${Date.now()}`
    const createResponse = await fetchLocal('/api/posts', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: `  ${title}  `, content: '  API integration content  ' }),
    })
    assert.equal(createResponse.status, 201)
    created = await createResponse.json()
    assert.equal(created.post.title, title)
    assert.equal(created.post.content, 'API integration content')
    assert.match(created.editToken, /^[a-f0-9]{64}$/)
    const listHtml = await (await fetchLocal('/posts')).text()
    assert.ok(listHtml.includes(title), 'list must render the newly created backend post')
    assert.ok(!listHtml.includes('MOCK DATA'))
    const detailHtml = await (await fetchLocal(`/posts/${created.post.id}`)).text()
    assert.ok(detailHtml.includes(title))
    assert.ok(detailHtml.includes('API integration content'))
    const detail = await (await fetchLocal(`/api/posts/${created.post.id}?view=0`)).json()
    assert.equal(detail.views, 0, 'SSR must not count a visit')
    await (await fetchLocal(`/posts/${created.post.id}`)).text()
    await (await fetchLocal(`/posts/${created.post.id}`, { headers: { RSC: '1', 'Next-Router-Prefetch': '1' } })).text()
    const afterReads = await (await fetchLocal(`/api/posts/${created.post.id}?view=0`)).json()
    assert.equal(afterReads.views, 0, 'repeated SSR/prefetch reads must not count a visit')
    const visitsRoute = `/api/posts/${created.post.id}/visits`
    const firstVisitId = randomUUID()
    async function visit(visitId) {
      const response = await fetchLocal(visitsRoute, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ visitId }),
      })
      assert.equal(response.status, 200)
      return response.json()
    }
    assert.equal((await visit(firstVisitId)).views, 1)
    const replayed = await Promise.all(Array.from({ length: 12 }, () => visit(firstVisitId)))
    assert.ok(replayed.every((result) => result.views === 1), 'same visit replay must count once')
    assert.equal((await visit(firstVisitId.toUpperCase())).views, 1)
    const newVisits = Array.from({ length: 4 }, () => randomUUID())
    await Promise.all(newVisits.map(visit))
    assert.equal((await visit(newVisits[0])).views, 5, 'new visits count individually; retry does not')
    for (const body of [{}, { visitId: 'not-a-uuid' }]) {
      const invalidVisit = await fetchLocal(visitsRoute, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      })
      assert.equal(invalidVisit.status, 400)
    }
    await stop()
    await start(base)
    assert.equal((await visit(firstVisitId)).views, 5, 'deduplication must persist across restart')
    const listedPost = (await (await fetchLocal('/api/posts')).json()).posts.find((item) => item.id === created.post.id)
    assert.equal(listedPost.views, 5, 'list must expose the visit count')
    console.log('PASS: read-only SSR/prefetch, visit counting, concurrent retry deduplication and restart persistence')

    const editHtml = await (await fetchLocal(`/posts/${created.post.id}/edit`)).text()
    assert.match(editHtml, /이야기를 다듬어 주세요/)
    const afterEditRead = await (await fetchLocal(`/api/posts/${created.post.id}?view=0`)).json()
    assert.equal(afterEditRead.views, 5, 'opening edit page must not increment views')
    otherCreated = await (await fetchLocal('/api/posts', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: `Other ${title}`, content: 'temporary auth fixture' }),
    })).json()
    const changedTitle = `Updated ${title}`
    const patchBody = { title: changedTitle, content: 'Changed integration body' }
    const noToken = await fetchLocal(`/api/posts/${created.post.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patchBody),
    })
    assert.equal(noToken.status, 401)
    for (const method of ['PATCH', 'DELETE']) {
      const wrongOwner = await fetchLocal(`/api/posts/${created.post.id}`, {
        method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${otherCreated.editToken}` },
        ...(method === 'PATCH' ? { body: JSON.stringify(patchBody) } : {}),
      })
      assert.equal(wrongOwner.status, 403)
    }
    const unchanged = await (await fetchLocal(`/api/posts/${created.post.id}?view=0`)).json()
    assert.equal(unchanged.title, title)
    const patch = await fetchLocal(`/api/posts/${created.post.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${created.editToken}` },
      body: JSON.stringify(patchBody),
    })
    assert.equal(patch.status, 200)
    assert.equal((await patch.json()).title, changedTitle)
    const changedHtml = await (await fetchLocal(`/posts/${created.post.id}`)).text()
    assert.ok(changedHtml.includes(changedTitle))
    const afterMutationRead = await (await fetchLocal(`/api/posts/${created.post.id}?view=0`)).json()
    assert.equal(afterMutationRead.views, 5, 'update and re-render alone must not count visits')
    const changedListHtml = await (await fetchLocal('/posts')).text()
    assert.ok(changedListHtml.includes(changedTitle))
    console.log('PASS: read-only edit SSR, tokenless 401, other-owner 403, and authorized PATCH')

    const search = new URLSearchParams({ q: changedTitle })
    const searchHtml = await (await fetchLocal(`/posts?${search}`)).text()
    assert.ok(searchHtml.includes(changedTitle))
    assert.ok(!searchHtml.includes(`Other ${title}`), 'search must filter by title')
    const emptyHtml = await (await fetchLocal(`/posts?${new URLSearchParams({ q: `${title} nonexistent` })}`)).text()
    assert.match(emptyHtml, /검색 결과가 없어요/)
    const secondPage = await (await fetchLocal(`/api/posts?${new URLSearchParams({ q: title, size: '1', page: '2' })}`)).json()
    assert.equal(secondPage.page, 2)
    assert.equal(secondPage.posts.length, 1)
    let outOfRange = await (await fetchLocal(`/posts?${search}&page=999`)).text()
    if (!outOfRange.includes(changedTitle)) {
      // Next.js may stream a redirect after loading.tsx has already sent a 200 shell.
      const metaRedirect = outOfRange.match(/http-equiv="refresh" content="\d+;url=([^"]+)"/i)
      assert.ok(metaRedirect, 'out-of-range page must emit a redirect')
      const target = new URL(metaRedirect[1].replaceAll('&amp;', '&'), base)
      assert.equal(target.origin, base)
      assert.equal(target.searchParams.get('q'), changedTitle)
      assert.equal(target.searchParams.get('page'), null)
      outOfRange = await (await fetchLocal(target.pathname + target.search)).text()
    }
    assert.ok(outOfRange.includes(changedTitle), 'redirect must show the last available page')
    const invalidPage = await (await fetchLocal(`/posts?${search}&page=-1`)).text()
    assert.ok(invalidPage.includes(changedTitle))
    for (let index = 0; index < 9; index++) {
      const response = await fetchLocal('/api/posts', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: `Paging ${index} ${title}`, content: 'temporary paging fixture' }),
      })
      assert.equal(response.status, 201)
      pagingCreated.push(await response.json())
    }
    const pagedQuery = new URLSearchParams({ q: title })
    const firstPageHtml = await (await fetchLocal(`/posts?${pagedQuery}`)).text()
    assert.match(firstPageHtml, /게시글 페이지 이동/)
    assert.ok(!firstPageHtml.includes(changedTitle), 'oldest match must be on the next page')
    const secondPageHtml = await (await fetchLocal(`/posts?${pagedQuery}&page=2`)).text()
    assert.ok(secondPageHtml.includes(changedTitle), 'page two must keep the search filter')
    assert.match(secondPageHtml, /11–11/)
    for (const fixture of pagingCreated) {
      const cleanup = await fetchLocal(`/api/posts/${fixture.post.id}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${fixture.editToken}` },
      })
      assert.equal(cleanup.status, 204)
    }
    pagingCreated.length = 0
    console.log('PASS: title search, no results, pagination UI/filter preservation, and invalid/out-of-range pages')

    const invalid = await fetchLocal('/api/posts', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: ' ', content: 'body' }),
    })
    assert.equal(invalid.status, 400)
    const newHtml = await (await fetchLocal('/posts/new')).text()
    assert.match(newHtml, /이야기 등록/)
    assert.ok(!newHtml.includes('미리보기만 가능'))
    const missingHtml = await (await fetchLocal('/posts/not-a-post')).text()
    assert.match(missingHtml, /이야기를 찾을 수 없어요/)
    const missingEditHtml = await (await fetchLocal('/posts/not-a-post/edit')).text()
    assert.match(missingEditHtml, /이야기를 찾을 수 없어요/)
    const missingPage = await fetchLocal('/missing-route')
    assert.equal(missingPage.status, 404)
    assert.match(await missingPage.text(), /페이지를 찾을 수 없어요/)
    console.log('PASS: backend validation, creation page, and missing post UI')

    const deleted = await fetchLocal(`/api/posts/${created.post.id}`, {
      method: 'DELETE', headers: { Authorization: `Bearer ${created.editToken}` },
    })
    assert.equal(deleted.status, 204)
    const deletedVisit = await fetchLocal(visitsRoute, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ visitId: randomUUID() }),
    })
    assert.equal(deletedVisit.status, 404)
    created = undefined
    const cleanedHtml = await (await fetchLocal('/posts')).text()
    assert.ok(!cleanedHtml.includes(changedTitle), 'test post must be removed')
    const missingAfterDelete = await (await fetchLocal(`/posts/${detail.id}`)).text()
    assert.match(missingAfterDelete, /이야기를 찾을 수 없어요/)
    const deletedOther = await fetchLocal(`/api/posts/${otherCreated.post.id}`, {
      method: 'DELETE', headers: { Authorization: `Bearer ${otherCreated.editToken}` },
    })
    assert.equal(deletedOther.status, 204)
    otherCreated = undefined
    console.log('PASS: test post cleaned up')

    await stop()
    await start('http://127.0.0.1:1')
    for (const route of ['/posts', '/posts/1', '/posts/1/edit']) {
      const failedHtml = await (await fetchLocal(route)).text()
      assert.match(failedHtml, /이야기를 불러오지 못했어요/)
      assert.match(failedHtml, /다시 시도/)
    }
    console.log('PASS: list and detail display retry UI when backend is unavailable')
    backendFiles.forEach((file, index) => assert.deepEqual(readFileSync(path.join(root, file)), originalBackend[index]))
    console.log('PASS: provided backend source unchanged')
  } finally {
    try {
      for (const record of [created, otherCreated, ...pagingCreated].filter(Boolean)) {
        const cleanup = await fetchLocal(`/api/posts/${record.post.id}`, {
          method: 'DELETE', headers: { Authorization: `Bearer ${record.editToken}` },
        })
        assert.ok([204, 404].includes(cleanup.status), 'test cleanup failed')
      }
    } finally {
      await stop()
    }
  }
}

run().catch((error) => { console.error(error); process.exitCode = 1 })
