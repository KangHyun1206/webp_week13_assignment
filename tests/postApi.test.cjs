const { test, afterEach } = require('node:test')
const assert = require('node:assert/strict')
const { getPosts, getPost, createPost, updatePost, deletePost, recordPostVisit, PostApiError } = require('../.cache/test-build/services/postApi.js')
const { validatePost } = require('../.cache/test-build/lib/postValidation.js')
const { parsePostSearch, postListHref } = require('../.cache/test-build/lib/postListQuery.js')
const { createPostVisitSession } = require('../.cache/test-build/lib/postVisitSession.js')

const originalFetch = global.fetch
const originalBase = process.env.API_BASE_URL
const summary = { id: 1, title: '이야기', author: '익명', createdAt: '2026-11-24T01:00:00Z', views: 2 }
const post = { ...summary, content: '본문' }

afterEach(() => {
  global.fetch = originalFetch
  if (originalBase === undefined) delete process.env.API_BASE_URL
  else process.env.API_BASE_URL = originalBase
})

test('server list uses configured absolute URL, encoded query, and no-store', async () => {
  process.env.API_BASE_URL = 'http://backend.example:4100'
  const result = { posts: [summary], total: 1, page: 2, size: 5 }
  global.fetch = async (url, options) => {
    const requestUrl = new URL(url)
    assert.equal(requestUrl.origin, 'http://backend.example:4100')
    assert.equal(requestUrl.pathname, '/api/posts')
    assert.equal(requestUrl.searchParams.get('q'), '안녕 & 오늘')
    assert.equal(requestUrl.searchParams.get('page'), '2')
    assert.equal(requestUrl.searchParams.get('size'), '5')
    assert.equal(options.cache, 'no-store')
    assert.ok(options.signal)
    return Response.json(result)
  }
  assert.deepEqual(await getPosts({ q: '안녕 & 오늘', page: 2, size: 5 }), result)
})

test('empty list is valid data', async () => {
  process.env.API_BASE_URL = 'http://backend.example'
  global.fetch = async () => Response.json({ posts: [], total: 0, page: 1, size: 10 })
  assert.deepEqual((await getPosts()).posts, [])
})

test('detail is uncached and 404 alone becomes missing data', async () => {
  process.env.API_BASE_URL = 'http://backend.example'
  global.fetch = async (url, options) => {
    assert.equal(url, 'http://backend.example/api/posts/1?view=0')
    assert.equal(options.cache, 'no-store')
    return Response.json(post)
  }
  assert.deepEqual(await getPost('1'), post)
  global.fetch = async () => Response.json({ message: '게시글을 찾을 수 없습니다.' }, { status: 404 })
  assert.equal(await getPost('999'), null)
  global.fetch = async () => Response.json({ message: '서버 오류' }, { status: 500 })
  await assert.rejects(getPost('1'), (error) => error.status === 500 && error.message === '서버 오류')
})

test('creation posts trimmed JSON to same origin and returns management token', async () => {
  delete process.env.API_BASE_URL
  const result = { post, editToken: 'a'.repeat(64) }
  global.fetch = async (url, options) => {
    assert.equal(url, '/api/posts')
    assert.equal(options.method, 'POST')
    assert.equal(options.headers['Content-Type'], 'application/json')
    assert.deepEqual(JSON.parse(options.body), { title: '제목', content: '본 문' })
    return Response.json(result, { status: 201 })
  }
  assert.deepEqual(await createPost({ title: '  제목  ', content: '\n본 문\n' }), result)
})

test('validation rejects whitespace and over-limit inputs before sending a request', async () => {
  global.fetch = async () => assert.fail('invalid input must not reach backend')
  for (const input of [
    { title: '  ', content: '본문' },
    { title: '제목', content: '\n\t' },
    { title: 'a'.repeat(101), content: '본문' },
    { title: '제목', content: 'a'.repeat(5001) },
  ]) await assert.rejects(createPost(input), (error) => error.status === 400)
  assert.equal(validatePost({ title: 'a'.repeat(100), content: 'b'.repeat(5000) }), null)
})

test('request failure preserves backend validation message and status', async () => {
  global.fetch = async () => Response.json({ message: '제목을 확인하세요.' }, { status: 400 })
  await assert.rejects(createPost({ title: '제목', content: '본문' }),
    (error) => error instanceof PostApiError && error.status === 400 && error.message === '제목을 확인하세요.')
})

test('non-JSON errors, network failures, and unexpected response shapes are handled', async () => {
  process.env.API_BASE_URL = 'http://backend.example'
  global.fetch = async () => new Response('<html>Unavailable</html>', { status: 503 })
  await assert.rejects(getPosts(), (error) => error.status === 503)
  global.fetch = async () => { throw new TypeError('fetch failed') }
  await assert.rejects(getPosts(), /불러오지 못했습니다/)
  await assert.rejects(createPost({ title: '제목', content: '본문' }), /등록 여부를 확인/)
  global.fetch = async () => Response.json({ posts: [{ ...summary, createdAt: 'invalid date' }], total: 1, page: 1, size: 10 })
  await assert.rejects(getPosts(), /응답 형식/)
  global.fetch = async () => Response.json(null)
  await assert.rejects(getPost('1'), /응답 형식/)
})

test('missing or invalid server configuration is reported without fetching', async () => {
  global.fetch = async () => assert.fail('invalid config must not send requests')
  delete process.env.API_BASE_URL
  await assert.rejects(getPosts(), /설정되지 않았습니다/)
  process.env.API_BASE_URL = 'not a URL'
  await assert.rejects(getPosts(), /형식이 올바르지 않습니다/)
})

test('edit page reads do not increment views', async () => {
  process.env.API_BASE_URL = 'http://backend.example'
  global.fetch = async (url) => {
    assert.equal(url, 'http://backend.example/api/posts/1?view=0')
    return Response.json(post)
  }
  assert.deepEqual(await getPost('1'), post)
})

test('PATCH sends trimmed fields and bearer token', async () => {
  global.fetch = async (url, options) => {
    assert.equal(url, '/api/posts/1')
    assert.equal(options.method, 'PATCH')
    assert.equal(options.headers.Authorization, `Bearer ${'a'.repeat(64)}`)
    assert.deepEqual(JSON.parse(options.body), { title: '수정', content: '본문 수정' })
    return Response.json({ ...post, title: '수정', content: '본문 수정' })
  }
  const updated = await updatePost(1, { title: '  수정 ', content: '\n본문 수정 ' }, 'a'.repeat(64))
  assert.equal(updated.title, '수정')
})

test('DELETE handles 204 without reading a JSON body', async () => {
  global.fetch = async (url, options) => {
    assert.equal(url, '/api/posts/1')
    assert.equal(options.method, 'DELETE')
    assert.equal(options.headers.Authorization, `Bearer ${'a'.repeat(64)}`)
    const response = new Response(null, { status: 204 })
    response.json = () => assert.fail('204 must not be parsed as JSON')
    return response
  }
  assert.equal(await deletePost(1, 'a'.repeat(64)), undefined)
})

test('missing management token prevents mutation and wrong token returns backend 403', async () => {
  global.fetch = async () => assert.fail('missing token must not send mutation')
  await assert.rejects(deletePost(1, ''), (error) => error.status === 401)
  await assert.rejects(updatePost(1, { title: '수정', content: '본문' }, ''), (error) => error.status === 401)
  global.fetch = async () => Response.json({ message: '수정 또는 삭제 권한이 없습니다.' }, { status: 403 })
  await assert.rejects(deletePost(1, 'b'.repeat(64)), (error) => error.status === 403)
  await assert.rejects(updatePost(1, { title: '수정', content: '본문' }, 'b'.repeat(64)), (error) => error.status === 403)
})

test('update validation rejects invalid fields without touching backend', async () => {
  global.fetch = async () => assert.fail('invalid input must not send mutation')
  await assert.rejects(updatePost(1, { title: '  ', content: '본문' }, 'a'.repeat(64)), (error) => error.status === 400)
})

test('search URL preserves special characters and rejects invalid page values', () => {
  assert.deepEqual(parsePostSearch({ q: '  제목 & 오늘  ', page: '2' }), { q: '제목 & 오늘', page: 2 })
  for (const page of ['-1', '0', '1.5', 'abc', 'Infinity', '9999999999999999999999', '9007199254740991']) {
    assert.equal(parsePostSearch({ page }).page, 1)
  }
  assert.deepEqual(parsePostSearch({ q: ['first', 'second'], page: ['2', '3'] }), { q: 'first', page: 2 })
  const url = new URL(postListHref('제목 & 오늘', 3), 'http://example.test')
  assert.equal(url.searchParams.get('q'), '제목 & 오늘')
  assert.equal(url.searchParams.get('page'), '3')
  assert.equal(postListHref('', 1), '/posts')
})

test('only explicit visit recording sends a visit POST', async () => {
  const visitId = 'edc85620-caba-42e0-b3a8-524da9b64510'
  global.fetch = async (url, options) => {
    assert.equal(url, '/api/posts/1/visits')
    assert.equal(options.method, 'POST')
    assert.equal(options.cache, 'no-store')
    assert.deepEqual(JSON.parse(options.body), { visitId })
    return Response.json({ views: 3 })
  }
  assert.deepEqual(await recordPostVisit(1, { visitId }), { views: 3 })
})

test('effect replay, re-render and refresh reuse the same visit session', () => {
  let sequence = 0
  const tracker = createPostVisitSession(() => String(++sequence))
  const first = tracker.navigate('/posts/1')
  assert.equal(first, tracker.navigate('/posts/1'))
  assert.equal(first, tracker.navigate('/posts/1'))
  assert.equal(sequence, 1)
})

test('list/edit round trips, other posts and document restoration create new visits', () => {
  let sequence = 0
  const tracker = createPostVisitSession(() => String(++sequence))
  const first = tracker.navigate('/posts/1')
  tracker.navigate('/posts')
  const backFromList = tracker.navigate('/posts/1')
  assert.notEqual(backFromList.id, first.id)
  tracker.navigate('/posts/1/edit')
  const backFromEdit = tracker.navigate('/posts/1')
  assert.notEqual(backFromEdit.id, backFromList.id)
  tracker.navigate('/posts/2')
  const backFromOther = tracker.navigate('/posts/1')
  assert.notEqual(backFromOther.id, backFromEdit.id)
  const restored = tracker.navigate('/posts/1', true)
  assert.notEqual(restored.id, backFromOther.id)
  const reloaded = createPostVisitSession(() => String(++sequence)).navigate('/posts/1')
  assert.notEqual(reloaded.id, restored.id)
})
