import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, NavLink, Route, Routes, useLocation } from 'react-router';
import { useEffect, useRef } from 'react';
import { request, useBusiness } from '../../api';
import { ThemeToggle } from '../../components/ThemeToggle';
import { QueryMessage } from '../../components/QueryMessage';
import { sessionSchema, write } from './contracts';
import { Appointments, Overview } from './Appointments';
import { ServiceManagement, BarberManagement } from './Catalog';
import { Schedules } from './Schedules';
const loginSchema = z.object({ email: z.email(), password: z.string().min(1) });
export function Admin() {
  const client = useQueryClient(),
    location = useLocation(),
    main = useRef<HTMLElement>(null);
  const session = useQuery({
    queryKey: ['admin', 'session'],
    queryFn: () => request('/admin/session', sessionSchema),
    retry: false,
    staleTime: 0,
    refetchInterval: 60000,
  });
  const logout = useMutation({
    mutationFn: () => write('/logout', {}, session.data!),
    onSuccess: () => {
      client.removeQueries({ queryKey: ['admin'] });
      void session.refetch();
    },
  });
  const reset = useMutation({
    mutationFn: () =>
      write('/reset', { confirmation: 'RESET DEMO' }, session.data!),
    onSuccess: () => {
      void client.invalidateQueries();
    },
  });
  useEffect(() => {
    main.current?.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }, [location.pathname]);
  useEffect(() => {
    if (session.isError) {
      client.removeQueries({
        predicate: (query) =>
          query.queryKey[0] === 'admin' && query.queryKey[1] !== 'session',
      });
    }
  }, [client, session.isError]);
  if (session.isPending)
    return (
      <div className="app-container py-section">
        <p role="status">Checking administrator session…</p>
      </div>
    );
  if (session.isError || !session.data)
    return (
      <Login
        onLogin={() => {
          void session.refetch();
        }}
      />
    );
  return (
    <div className="admin-shell">
      <header className="admin-header app-container">
        <Link className="wordmark" to="/">
          Studio North.
        </Link>
        <span className="type-label text-accent">
          {session.data.scope === 'demo'
            ? 'Demo administration'
            : 'Administrator'}
        </span>
        <ThemeToggle />
        <button
          className="button"
          data-variant="secondary"
          type="button"
          onClick={() => logout.mutate()}
          disabled={logout.isPending}
        >
          Sign out
        </button>
      </header>
      <div className="app-container">
        <p className="notice type-caption">
          Fictional demo records only. No real business services, emails or
          payments.{' '}
          {session.data.scope === 'demo'
            ? 'This session only manages the designated synthetic demo database.'
            : 'Protected administrator access.'}
        </p>
        <nav className="admin-tabs" aria-label="Administration">
          {[
            ['/admin', 'Overview'],
            ['/admin/appointments', 'Appointments'],
            ['/admin/services', 'Services'],
            ['/admin/barbers', 'Barbers'],
            ['/admin/schedules', 'Schedules'],
          ].map(([to, label]) => (
            <NavLink key={to} to={to!} end className="text-link">
              {label}
            </NavLink>
          ))}
        </nav>
        <main ref={main} tabIndex={-1}>
          <Routes>
            <Route index element={<Overview />} />
            <Route
              path="appointments"
              element={<Appointments session={session.data} />}
            />
            <Route
              path="services"
              element={<ServiceManagement session={session.data} />}
            />
            <Route
              path="barbers"
              element={<BarberManagement session={session.data} />}
            />
            <Route
              path="schedules"
              element={<Schedules session={session.data} />}
            />
            <Route
              path="*"
              element={
                <>
                  <h1 className="type-title">Admin page not found</h1>
                  <Link to="/admin" className="text-link">
                    Return to overview
                  </Link>
                </>
              }
            />
          </Routes>
        </main>
        {session.data.scope === 'demo' && (
          <section className="demo-reset">
            <h2 className="type-subtitle">Restore the demonstration</h2>
            <p className="type-body text-secondary mt-3">
              This replaces demo catalog edits and synthetic appointments.
              Credentials and sessions are preserved.
            </p>
            <button
              type="button"
              className="button mt-4"
              data-variant="secondary"
              disabled={reset.isPending}
              onClick={() => {
                if (
                  window.confirm(
                    'Reset all designated demo catalog and appointment records?',
                  )
                )
                  reset.mutate();
              }}
            >
              Reset demo data
            </button>
            {reset.isSuccess && <p role="status">Demo data restored.</p>}
            {reset.error && <p role="alert">{reset.error.message}</p>}
          </section>
        )}
        {logout.error && <p role="alert">{logout.error.message}</p>}
      </div>
    </div>
  );
}
function Login({ onLogin }: { onLogin: () => void }) {
  const form = useForm<z.infer<typeof loginSchema>>({
      resolver: zodResolver(loginSchema),
    }),
    business = useBusiness();
  const mutation = useMutation({
    mutationFn: (values: z.infer<typeof loginSchema>) =>
      request('/admin/login', sessionSchema, {
        method: 'POST',
        body: JSON.stringify(values),
      }),
    onSuccess: () => {
      form.reset();
      onLogin();
    },
  });
  const demo = useMutation({
    mutationFn: () =>
      request('/admin/demo-login', sessionSchema, {
        method: 'POST',
        body: '{}',
      }),
    onSuccess: onLogin,
  });
  return (
    <main className="app-container login-page py-section">
      <Link to="/" className="text-link">
        Studio North home
      </Link>
      <h1 className="type-title mt-8">Studio administration.</h1>
      <p className="type-body text-secondary mt-4">
        A protected workspace for this fictional portfolio demo.
      </p>
      <form
        className="mt-8"
        onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
        noValidate
      >
        {(['email', 'password'] as const).map((key) => (
          <label className="field" key={key}>
            {key === 'email' ? 'Administrator email' : 'Password'}
            <input
              type={key === 'password' ? 'password' : 'email'}
              autoComplete={
                key === 'password' ? 'current-password' : 'username'
              }
              {...form.register(key)}
              aria-invalid={!!form.formState.errors[key]}
            />
            {form.formState.errors[key] && (
              <span role="alert">{form.formState.errors[key]?.message}</span>
            )}
          </label>
        ))}
        <button
          className="button"
          data-variant="primary"
          disabled={mutation.isPending}
        >
          {mutation.isPending ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
      {mutation.error && (
        <p role="alert" className="mt-4">
          {mutation.error.message}
        </p>
      )}
      {business.data?.demoMode && (
        <section className="mt-8">
          <h2 className="type-subtitle">Explore safely</h2>
          <p className="type-body mt-3 text-secondary">
            Use a restricted demo session with synthetic data. No password or
            private account access is provided.
          </p>
          <button
            type="button"
            className="button mt-4"
            data-variant="secondary"
            onClick={() => demo.mutate()}
            disabled={demo.isPending}
          >
            Enter demo administration
          </button>
          {demo.error && <p role="alert">{demo.error.message}</p>}
        </section>
      )}
      <QueryMessage
        pending={business.isPending}
        error={business.error}
        onRetry={() => {
          void business.refetch();
        }}
      />
    </main>
  );
}
