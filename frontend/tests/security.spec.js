// API-level security tests.
//
// WHY THIS FILE EXISTS
// The rest of the suite drives the browser as a signed-in user, so it cannot
// see whether the guarantees underneath still hold. Everything asserted here
// was a real hole at some point:
//
//   - RLS was off, so the public anon key could read AND write every table
//     directly through PostgREST, bypassing this API and all of its role checks
//   - /api/approval, /api/items, /api/personnel and /api/logs were mounted with
//     no middleware at all
//   - POST /api/auth/register was anonymous and honoured a client-supplied role
//   - there was no rate limiting of any kind
//   - proof uploads had no size limit and were buffered into memory unbounded
//   - a rejected job order creation permanently burned a JO number
//
// Without these tests a refactor could quietly reopen any of them while the
// browser suite stayed green.

import { test, expect, request as playwrightRequest } from '@playwright/test'
import fs from 'fs'
import path from 'path'

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'
const API_URL = process.env.API_URL || 'http://localhost:4000'

function readEnvFile(relativePath) {
  try {
    const file = path.join(process.cwd(), relativePath)
    return Object.fromEntries(
      fs
        .readFileSync(file, 'utf8')
        .split('\n')
        .filter((line) => line.trim() && !line.trim().startsWith('#'))
        .map((line) => {
          const i = line.indexOf('=')
          return [line.slice(0, i).trim(), line.slice(i + 1).trim()]
        })
    )
  } catch {
    return {}
  }
}

const frontendEnv = readEnvFile('.env.local')
const backendEnv = readEnvFile(path.join('..', 'backend', '.env'))

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || frontendEnv.NEXT_PUBLIC_SUPABASE_URL
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || frontendEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || backendEnv.SUPABASE_SERVICE_KEY

// Every table RLS must cover. A new table added without a policy shows up here.
const ALL_TABLES = [
  'users',
  'job_orders',
  'job_order_items',
  'job_order_personnel',
  'completion_reports',
  'notifications',
  'activity_logs',
  'inventory_items',
  'inventory_transactions',
  'jo_number_sequences',
]

async function login(api, email, password) {
  const res = await api.post(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    headers: { apikey: ANON_KEY, 'Content-Type': 'application/json' },
    data: { email, password },
  })
  expect(res.ok(), `login failed for ${email}`).toBeTruthy()
  return (await res.json()).access_token
}

test.describe('Row Level Security', () => {
  test.skip(!SUPABASE_URL || !ANON_KEY, 'Supabase env not available')

  test('the anon key cannot read any table', async () => {
    const api = await playwrightRequest.newContext()

    for (const table of ALL_TABLES) {
      const res = await api.get(`${SUPABASE_URL}/rest/v1/${table}?select=*&limit=5`, {
        headers: { apikey: ANON_KEY },
      })

      // PostgREST answers 200 with an empty array when RLS filters every row,
      // and 401/403 when the role has no access at all. Either is a pass; rows
      // coming back is not.
      if (res.ok()) {
        const rows = await res.json()
        expect(
          Array.isArray(rows) ? rows.length : 0,
          `anon key read ${rows.length ?? '?'} row(s) from ${table} — RLS is not protecting it. Apply backend/sql/005_rls.sql.`
        ).toBe(0)
      } else {
        expect([401, 403]).toContain(res.status())
      }
    }

    await api.dispose()
  })

  test('the anon key cannot insert', async () => {
    const api = await playwrightRequest.newContext()

    const res = await api.post(`${SUPABASE_URL}/rest/v1/users`, {
      headers: { apikey: ANON_KEY, 'Content-Type': 'application/json' },
      data: {
        id: '00000000-0000-0000-0000-000000000001',
        name: 'rls probe',
        email: `rls-probe-${Date.now()}@example.com`,
      },
    })

    expect(res.ok(), 'anon key was allowed to insert into public.users').toBeFalsy()
    await api.dispose()
  })

  test('the anon key cannot update a real row', async () => {
    test.skip(!SERVICE_KEY, 'service key not available to locate a row')
    const api = await playwrightRequest.newContext()

    const listed = await api.get(`${SUPABASE_URL}/rest/v1/job_orders?select=id,location&limit=1`, {
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
    })
    const rows = await listed.json()
    test.skip(!Array.isArray(rows) || rows.length === 0, 'no job order to target')

    // Writes the row's own value back, so even if RLS were open nothing changes.
    const res = await api.patch(`${SUPABASE_URL}/rest/v1/job_orders?id=eq.${rows[0].id}`, {
      headers: { apikey: ANON_KEY, 'Content-Type': 'application/json', Prefer: 'return=representation' },
      data: { location: rows[0].location },
    })

    const affected = res.ok() ? await res.json() : []
    expect(
      Array.isArray(affected) ? affected.length : 0,
      'anon key could see and update a real job order row'
    ).toBe(0)

    await api.dispose()
  })

  test('a technician cannot read another technician’s job order', async () => {
    test.skip(!SERVICE_KEY, 'service key needed to seed a foreign job order')
    const api = await playwrightRequest.newContext()
    const svc = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` }

    const others = await api.get(
      `${SUPABASE_URL}/rest/v1/users?select=id&role=eq.technician&email=neq.technician@gmail.com&limit=1`,
      { headers: svc }
    )
    const otherTechs = await others.json()
    test.skip(!Array.isArray(otherTechs) || otherTechs.length === 0, 'needs a second technician account')

    const created = await api.post(`${SUPABASE_URL}/rest/v1/job_orders`, {
      headers: { ...svc, 'Content-Type': 'application/json', Prefer: 'return=representation' },
      data: {
        jo_number: `RLS-ISOLATION-${Date.now()}`,
        date: new Date().toISOString().slice(0, 10),
        location: 'RLS isolation probe',
        status: 'draft',
        receiver_id: otherTechs[0].id,
      },
    })
    const probe = (await created.json())[0]

    try {
      const token = await login(api, 'technician@gmail.com', 'technician123')
      const seen = await api.get(`${SUPABASE_URL}/rest/v1/job_orders?select=id&id=eq.${probe.id}`, {
        headers: { apikey: ANON_KEY, Authorization: `Bearer ${token}` },
      })
      const rows = await seen.json()
      expect(
        Array.isArray(rows) ? rows.length : 0,
        'a technician could read a job order assigned to someone else'
      ).toBe(0)
    } finally {
      await api.delete(`${SUPABASE_URL}/rest/v1/job_orders?id=eq.${probe.id}`, { headers: svc })
      await api.dispose()
    }
  })
})

test.describe('API authentication', () => {
  const PROTECTED = [
    { method: 'get', path: '/api/approval' },
    { method: 'get', path: '/api/items' },
    { method: 'get', path: '/api/personnel' },
    { method: 'get', path: '/api/logs' },
    { method: 'get', path: '/api/job-orders' },
    { method: 'get', path: '/api/users' },
    { method: 'get', path: '/api/inventory/items' },
  ]

  for (const { method, path: p } of PROTECTED) {
    test(`${method.toUpperCase()} ${p} rejects an unauthenticated caller`, async ({ request }) => {
      const res = await request[method](`${API_URL}${p}`)
      expect(res.status(), `${p} answered ${res.status()} without a token`).toBe(401)
    })
  }

  test('POST /api/approval rejects an unauthenticated caller', async ({ request }) => {
    const res = await request.post(`${API_URL}/api/approval`, {
      data: { job_order_id: '00000000-0000-0000-0000-000000000000', action: 'approve' },
    })
    expect(res.status()).toBe(401)
  })

  test('POST /api/auth/register is not open to the public', async ({ request }) => {
    const res = await request.post(`${API_URL}/api/auth/register`, {
      data: { email: `probe-${Date.now()}@example.com`, password: 'Probe123!', role: 'admin' },
    })
    expect(res.status(), 'register allowed an anonymous caller to create an account').toBe(401)
  })
})

test.describe('Role enforcement', () => {
  test.skip(!SUPABASE_URL || !ANON_KEY, 'Supabase env not available')

  test('a technician cannot approve a job order', async ({ request }) => {
    const api = await playwrightRequest.newContext()
    const token = await login(api, 'technician@gmail.com', 'technician123')
    await api.dispose()

    const res = await request.post(`${API_URL}/api/approval`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { job_order_id: '00000000-0000-0000-0000-000000000000', action: 'approve' },
    })
    expect(res.status(), 'a technician was allowed to approve').toBe(403)
  })

  test('the inventory role cannot reach job orders', async ({ request }) => {
    const api = await playwrightRequest.newContext()
    const token = await login(api, 'inventory@gmail.com', 'inventory123')
    await api.dispose()

    const res = await request.get(`${API_URL}/api/job-orders`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.status(), 'the inventory role reached job orders').toBe(403)
  })

  test('a technician cannot list users', async ({ request }) => {
    const api = await playwrightRequest.newContext()
    const token = await login(api, 'technician@gmail.com', 'technician123')
    await api.dispose()

    const res = await request.get(`${API_URL}/api/users`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.status()).toBe(403)
  })
})

test.describe('Request handling', () => {
  test('an unknown /api path answers with JSON, not an HTML error page', async ({ request }) => {
    const res = await request.get(`${API_URL}/api/definitely-not-a-route`)
    expect(res.status()).toBe(404)
    expect(res.headers()['content-type']).toContain('application/json')
    expect((await res.json()).error).toBeTruthy()
  })

  test('a malformed JSON body answers 400 in JSON', async ({ request }) => {
    const res = await request.post(`${API_URL}/api/approval`, {
      headers: { 'Content-Type': 'application/json' },
      data: '{ not valid json',
    })
    expect(res.status()).toBe(400)
    expect(res.headers()['content-type']).toContain('application/json')
  })

  test('security headers are present and /health stays reachable', async ({ request }) => {
    const res = await request.get(`${API_URL}/health`)
    expect(res.status(), '/health must never be rate limited or blocked').toBe(200)
    expect(res.headers()['x-content-type-options']).toBe('nosniff')
    expect(res.headers()['x-frame-options']).toBeTruthy()
  })
})

test.describe('Upload limits', () => {
  test.skip(!SUPABASE_URL || !ANON_KEY, 'Supabase env not available')

  test('an oversized proof is refused', async ({ request }) => {
    const api = await playwrightRequest.newContext()
    const token = await login(api, 'technician@gmail.com', 'technician123')
    await api.dispose()

    const res = await request.post(`${API_URL}/api/jo/upload-proof`, {
      headers: { Authorization: `Bearer ${token}` },
      multipart: {
        file: { name: 'huge.png', mimeType: 'image/png', buffer: Buffer.alloc(8 * 1024 * 1024) },
        jobOrderId: 'upload-limit-probe',
      },
    })

    expect(res.status(), 'an 8MB upload was accepted; multer limits are missing').toBe(413)
  })

  test('a disallowed file type is refused', async ({ request }) => {
    const api = await playwrightRequest.newContext()
    const token = await login(api, 'technician@gmail.com', 'technician123')
    await api.dispose()

    const res = await request.post(`${API_URL}/api/jo/upload-proof`, {
      headers: { Authorization: `Bearer ${token}` },
      multipart: {
        file: { name: 'payload.exe', mimeType: 'application/x-msdownload', buffer: Buffer.from('MZ') },
        jobOrderId: 'upload-type-probe',
      },
    })

    expect(res.status()).toBe(400)
  })
})

test.describe('JO number integrity', () => {
  test.skip(!SERVICE_KEY || !SUPABASE_URL, 'service key needed to read the sequence')

  test('a rejected job order creation does not consume a JO number', async ({ request }) => {
    const api = await playwrightRequest.newContext()
    const svc = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` }

    const readSequence = async () => {
      const res = await api.get(`${SUPABASE_URL}/rest/v1/jo_number_sequences?select=last_value`, {
        headers: svc,
      })
      const rows = await res.json()
      return Array.isArray(rows) && rows.length > 0 ? Number(rows[0].last_value) : 0
    }

    const token = await login(api, 'admin@gmail.com', 'admin123')
    const before = await readSequence()

    // Each of these is rejected for a different reason, and each used to burn a
    // number because it was drawn before validation ran.
    const rejected = [
      { status: 'sent', location: 'Burn probe', date: '2026-01-01', items: [{ item_no: 1, item_name: 'CCTV', quantity: 1 }], personnel: [] },
      { status: 'sent', location: '', date: '2026-01-01', items: [{ item_no: 1, item_name: 'CCTV', quantity: 1 }], personnel: [{ name: 'X' }] },
      { status: 'sent', location: 'Burn probe', date: '2026-01-01', items: [{ item_no: 1, item_name: 'CCTV', quantity: 9999999 }], personnel: [{ name: 'X' }] },
    ]

    for (const data of rejected) {
      const res = await request.post(`${API_URL}/api/job-orders`, {
        headers: { Authorization: `Bearer ${token}` },
        data,
      })
      expect(res.ok(), `expected this payload to be rejected: ${JSON.stringify(data)}`).toBeFalsy()
    }

    const after = await readSequence()
    expect(
      after,
      `the JO sequence moved ${before} -> ${after} across ${rejected.length} rejected creates; numbers are being burned and the audit trail will have gaps`
    ).toBe(before)

    await api.dispose()
  })
})

// Kept last: exhausting the burst window would make everything after it fail.
test.describe('Rate limiting', () => {
  test.skip(!SUPABASE_URL || !ANON_KEY, 'Supabase env not available')

  test('a read the UI performs on every page load is not account-limited', async ({ request }) => {
    const api = await playwrightRequest.newContext()
    const token = await login(api, 'admin@gmail.com', 'admin123')
    await api.dispose()

    // The Create JO page reads this on every load. It was briefly caught by the
    // 40-per-15-minutes account limiter, which silently emptied the technician
    // dropdown and made job order creation impossible.
    for (let i = 0; i < 45; i += 1) {
      const res = await request.get(`${API_URL}/api/users/technicians`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      expect(
        res.status(),
        `GET /api/users/technicians returned ${res.status()} on request ${i + 1}; a read the UI depends on is being account-limited`
      ).toBe(200)
    }
  })

  // OPT-IN. Triggering the burst limiter requires firing more requests than the
  // configured budget, which then leaves the shared per-IP quota depleted --
  // both the 1 minute burst window and a large slice of the 15 minute sustained
  // window. Any run that starts soon after fails at the head of the chain with
  // "Too many requests", which looks like a product bug and is not one.
  //
  // Enable deliberately:  RUN_RATE_LIMIT_BURST_TEST=1 npx playwright test --project=security
  test('a burst of requests is throttled', async ({ request }) => {
    test.skip(
      !process.env.RUN_RATE_LIMIT_BURST_TEST,
      'Opt-in: depletes the shared per-IP rate limit budget. Set RUN_RATE_LIMIT_BURST_TEST=1.'
    )

    const burst = Number(process.env.RATE_LIMIT_BURST || 300)
    const attempts = burst + 80

    const statuses = await Promise.all(
      Array.from({ length: attempts }, () =>
        request
          .get(`${API_URL}/api/job-orders?limit=1`)
          .then((r) => r.status())
          .catch(() => 0)
      )
    )

    const throttled = statuses.filter((s) => s === 429).length
    expect(
      throttled,
      `${attempts} requests produced no 429; rate limiting is not active on /api`
    ).toBeGreaterThan(0)
  })
})
