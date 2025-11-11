// TanStack Router v1 + RBAC + TanStack Query + Axios interceptors — single-file demo
// ---------------------------------------------------------------------------------
// Paste this file into e.g. `src/App.tsx` of a Vite React + TS project and install deps:
//   npm i @tanstack/react-router @tanstack/react-query axios
//   npm i -D typescript
// Then render <App /> in main.tsx.
// This shows:
//  1) Auth context with roles/permissions + helpers (hasRole/hasAnyRole/hasPermission)
//  2) Router context typed with auth, guards using `beforeLoad`
//  3) Authenticated layout + Admin layout (role‑gated)
//  4) Permission‑gated page + component‑level <PermissionGuard>
//  5) Unauthorized page with redirect + reason handling
//  6) TanStack Query + Axios instance with refresh‑token interceptor

import React, { createContext, useContext, useMemo, useState } from 'react'
import axios, { AxiosError,  } from 'axios'
import {
  RouterProvider,
  createRouter,
  createRootRouteWithContext,
  createRoute,
  redirect,
  Link,
  Outlet,
  useSearch,
  useParams,
} from '@tanstack/react-router'
import { QueryClient, QueryClientProvider, useQuery, useMutation } from '@tanstack/react-query'

// ----------------------
//  Auth types & helpers
// ----------------------

type Role = 'user' | 'manager' | 'admin'
type Permission =
  | 'users:read'
  | 'users:write'
  | 'billing:view'
  | 'reports:view'
  | `resource:${string}:edit` // example of resource-scoped permission

export type AuthUser = {
  id: string
  name: string
  roles: Role[]
  permissions: Permission[]
}

type AuthContextType = {
  user: AuthUser | null
  loginAs: (who: 'guest' | 'user' | 'manager' | 'admin') => void
  logout: () => void
  hasRole: (role: Role) => boolean
  hasAnyRole: (roles: Role[]) => boolean
  hasPermission: (perm: Permission) => boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('AuthContext missing')
  return ctx
}

// Fake users for demo
const USERS: Record<string, AuthUser> = {
  user: {
    id: 'u1',
    name: 'Uma User',
    roles: ['user'],
    permissions: ['reports:view'],
  },
  manager: {
    id: 'm1',
    name: 'Manny Manager',
    roles: ['manager'],
    permissions: ['users:read', 'reports:view'],
  },
  admin: {
    id: 'a1',
    name: 'Alice Admin',
    roles: ['admin'],
    permissions: ['users:read', 'users:write', 'billing:view', 'reports:view', 'resource:42:edit'],
  },
}

function AuthProvider({ children, queryClient, http }: { children: React.ReactNode; queryClient: QueryClient; http: any }) {
  const [user, setUser] = useState<AuthUser | null>(null)

  const value = useMemo<AuthContextType>(() => ({
    user,
    loginAs: (who) => {
      if (who === 'guest') setUser(null)
      else setUser(USERS[who])
      // clear and refetch app data on identity change
      queryClient.clear()
    },
    logout: () => {
      setUser(null)
      queryClient.clear()
    },
    hasRole: (role) => !!user?.roles.includes(role),
    hasAnyRole: (roles) => roles.some((r) => !!user?.roles.includes(r)),
    hasPermission: (perm) => !!user?.permissions.includes(perm),
  }), [user, queryClient])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// ----------------------
//  Axios + Refresh token
// ----------------------

function createHttp(getAccessToken: () => string | null, setAccessToken: (t: string | null) => void) {
  const http = axios.create({ baseURL: 'https://api.example.dev' })

  // Inject token
  http.interceptors.request.use((config) => {
    const token = getAccessToken()
    if (token) config.headers.Authorization = `Bearer ${token}`
    return config
  })

  // Simple refresh flow for demo
  let refreshing: Promise<string | null> | null = null
  http.interceptors.response.use(
    (res) => res,
    async (error: AxiosError) => {
      const original = error.config
      if (!original) throw error
      const status = error.response?.status
      if (status === 401 && !((original as any)._retry)) {
        ;(original as any)._retry = true
        if (!refreshing) {
          refreshing = (async () => {
            try {
              // fake refresh
              const refreshed = 'new-demo-token'
              setAccessToken(refreshed)
              return refreshed
            } catch (e) {
              setAccessToken(null)
              return null
            } finally {
              setTimeout(() => (refreshing = null), 0)
            }
          })()
        }
        const newToken = await refreshing
        if (newToken) {
          original.headers = original.headers ?? {}
          ;(original.headers as any).Authorization = `Bearer ${newToken}`
          return http(original)
        }
      }
      throw error
    },
  )

  return http
}

// ----------------------
//  Query examples (uses Axios)
// ----------------------

function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      // In a real app, hit your API:
      // const { data } = await http.get('/users')
      // return data
      await new Promise((r) => setTimeout(r, 200))
      return [
        { id: 'u1', name: 'Uma User' },
        { id: 'm1', name: 'Manny Manager' },
      ]
    },
  })
}

function useCreateUser() {
  return useMutation({
    mutationFn: async (payload: { name: string }) => {
      await new Promise((r) => setTimeout(r, 200))
      return { id: Math.random().toString(36).slice(2), ...payload }
    },
  })
}

// -------------------------------------------------
//  Router context (typed with our Auth + utilities)
// -------------------------------------------------

type RouterContext = {
  auth: AuthContextType
}

const rootRoute = createRootRouteWithContext<RouterContext>()({
  component: PublicLayout,
})

// Public layout (top‑nav)
function PublicLayout() {
  const { user, loginAs, logout } = useAuth()
  return (
    <div style={{ fontFamily: 'sans-serif', padding: 16 }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16 }}>
        <Link to="/">Home</Link>
        <Link to="/_authenticated/reports">Reports</Link>
        <Link to="/_authenticated/billing">Billing</Link>
        <Link to="/_authenticated/users">Users</Link>
        <Link to="/_authenticated/admin">Admin</Link>
        <Link to="/_authenticated/resource/42">Resource:42</Link>
        <span style={{ marginLeft: 'auto' }}>
          {user ? (
            <>
              <strong>{user.name}</strong> &nbsp;
              <button onClick={() => logout()}>Logout</button>
            </>
          ) : (
            <>
              <button onClick={() => loginAs('user')}>Login as User</button>{' '}
              <button onClick={() => loginAs('manager')}>Login as Manager</button>{' '}
              <button onClick={() => loginAs('admin')}>Login as Admin</button>
            </>
          )}
        </span>
      </div>
      <hr />
      <div style={{ marginTop: 16 }}>
        <Outlet />
      </div>
    </div>
  )
}


// Home route (public)
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: () => (
    <div>
      <h2>Welcome</h2>
      <p>This is a demo of TanStack Router + RBAC + Query + Axios</p>
    </div>
  ),
})

// Unauthorized route
const unauthorizedRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/unauthorized',
  component: () => {
    const search = useSearch({ from: '/unauthorized' }) as { redirect?: string; reason?: string }
    return (
      <div>
        <h2>Unauthorized</h2>
        <p>Reason: <code>{search.reason ?? 'unknown'}</code></p>
        {search.redirect && (
          <p>
            <a href={search.redirect}>Go back</a>
          </p>
        )}
      </div>
    )
  },
})

// -----------------------------
//  Authenticated layout (gate)
// -----------------------------
const authenticatedLayout = createRoute({
  getParentRoute: () => rootRoute,
  path: '/_authenticated',
  beforeLoad: ({ context, location }) => {
    if (!context.auth.user) {
      throw redirect({ to: '/unauthorized', search: { redirect: location.href, reason: 'not_authenticated' } })
    }
  },
  component: () => (
    <div>
      <h3>Authenticated Area</h3>
      <Outlet />
    </div>
  ),
})

// Example: reports page (permission‑gated by component)
const reportsRoute = createRoute({
  getParentRoute: () => authenticatedLayout,
  path: 'reports',
  component: () => (
    <PermissionGuard require={{ permission: 'reports:view' }} fallback={<p>Need reports:view</p>}>
      <h2>Reports</h2>
      <p>Only users with <code>reports:view</code> can see this.</p>
    </PermissionGuard>
  ),
})

// Example: billing page (permission‑gated by beforeLoad)
const billingRoute = createRoute({
  getParentRoute: () => authenticatedLayout,
  path: 'billing',
  beforeLoad: ({ context, location }) => {
    if (!context.auth.hasPermission('billing:view')) {
      throw redirect({ to: '/unauthorized', search: { redirect: location.href, reason: 'insufficient_permissions' } })
    }
  },
  component: () => (
    <div>
      <h2>Billing</h2>
      <p>Sensitive numbers here…</p>
    </div>
  ),
})

// -----------------------------
//  Admin layout (role‑gated)
// -----------------------------
const adminLayout = createRoute({
  getParentRoute: () => authenticatedLayout,
  path: 'admin',
  beforeLoad: ({ context, location }) => {
    if (!context.auth.hasRole('admin')) {
      throw redirect({ to: '/unauthorized', search: { redirect: location.href, reason: 'admin_only' } })
    }
  },
  component: () => (
    <div>
      <h2>Admin Area</h2>
      <Outlet />
    </div>
  ),
})

// Admin -> Users management (permission example + Query/Mutation)
const usersRoute = createRoute({
  getParentRoute: () => adminLayout,
  path: 'users',
  component: () => {
    const { data, isLoading } = useUsers()
    const createUser = useCreateUser()
    const auth = useAuth()

    return (
      <div>
        <h3>User Management</h3>
        {isLoading ? <p>Loading…</p> : (
          <ul>
            {data?.map((u) => (
              <li key={u.id}>{u.name}</li>
            ))}
          </ul>
        )}

        <PermissionGuard require={{ permission: 'users:write' }}>
          <button
            onClick={() => createUser.mutate({ name: 'New User' })}
            disabled={createUser.isPending}
          >
            {createUser.isPending ? 'Creating…' : 'Create User'}
          </button>
        </PermissionGuard>

        {!auth.hasPermission('users:write') && (
          <p style={{ color: 'crimson' }}>You can view users but cannot create them.</p>
        )}
      </div>
    )
  },
})

// -----------------------------
//  Multi‑role route (any of…)
// -----------------------------
const managersOrAdminsRoute = createRoute({
  getParentRoute: () => authenticatedLayout,
  path: 'users',
  beforeLoad: ({ context, location }) => {
    if (!context.auth.hasAnyRole(['manager', 'admin'])) {
      throw redirect({ to: '/unauthorized', search: { redirect: location.href, reason: 'role_required:manager_or_admin' } })
    }
  },
  component: () => (
    <div>
      <h2>Users (Managers or Admins)</h2>
      <p>You have at least one of the required roles.</p>
      <Link to="/admin/users">Go to Admin Users</Link>
    </div>
  ),
})

// -----------------------------
//  Resource‑scoped example
// -----------------------------
const resourceRoute = createRoute({
  getParentRoute: () => authenticatedLayout,
  path: 'resource/$id',
  beforeLoad: ({ context, location, params }) => {
    const need: Permission = `resource:${params.id}:edit`
    if (!context.auth.hasPermission(need)) {
      throw redirect({ to: '/unauthorized', search: { redirect: location.href, reason: `missing:${need}` } })
    }
  },
  component: ( ) => {
    const { id } = useParams({ from: '/_authenticated/resource/$id' })
   return <div>
      <h2>Resource {id}</h2>
      <p>You can edit this resource because you have a resource‑scoped permission.</p>
    </div>
  },
})

// --------------------------------------------
//  Component‑level guard for fine‑grained UI
// --------------------------------------------
function PermissionGuard({
  require,
  fallback = null,
  children,
}: {
  require: { permission?: Permission; role?: Role; anyRoles?: Role[] }
  fallback?: React.ReactNode
  children: React.ReactNode
}) {
  const { hasPermission, hasRole, hasAnyRole } = useAuth()
  const ok =
    (require.permission ? hasPermission(require.permission) : true) &&
    (require.role ? hasRole(require.role) : true) &&
    (require.anyRoles ? hasAnyRole(require.anyRoles) : true)

  return <>{ok ? children : fallback}</>
}

// -----------------------------
//  Router assembly
// -----------------------------
const routeTree = rootRoute.addChildren([
  indexRoute,
  unauthorizedRoute,
  authenticatedLayout.addChildren([
    reportsRoute,
    billingRoute,
    managersOrAdminsRoute,
    adminLayout.addChildren([usersRoute]),
    resourceRoute,
  ]),
])

const router = createRouter({
  routeTree,
  // context added at runtime in <App />
  context: undefined as unknown as RouterContext,
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

// -----------------------------
//  App root
// -----------------------------
export default function App() {
  const [accessToken, setAccessToken] = useState<string | null>('demo-token')
  const http = useMemo(() => createHttp(() => accessToken, setAccessToken), [accessToken])
  const queryClient = useMemo(() => new QueryClient(), [])

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider queryClient={queryClient} http={http}>
        <AuthInjector>
          <RouterProvider router={router} />
        </AuthInjector>
      </AuthProvider>
    </QueryClientProvider>
  )
}

// Provide router context from Auth
function AuthInjector({ children }: { children: React.ReactNode }) {
  const auth = useAuth()
  router.update({ context: { auth } })
  return <>{children}</>
}
