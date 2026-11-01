import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';

type Customer = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  createdAt: string;
  _count: { orders: number };
};

export function AdminCustomersPanel() {
  const { user, request } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user?.role !== 'ADMIN') return;
    request<Customer[]>('/api/admin/customers')
      .then(setCustomers)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load customers'))
      .finally(() => setLoading(false));
  }, [user?.id]);

  if (user?.role !== 'ADMIN') return null;

  const filtered = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase()) ||
      (c.phone && c.phone.includes(search))
  );

  return (
    <section className="mt-6 rounded-2xl bg-white p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink/15 pb-4">
        <div>
          <h2 className="text-2xl font-bold">Registered Customers ({customers.length})</h2>
          <p className="mt-1 text-sm text-ink-soft">
            Directory of customer accounts and their total order volumes.
          </p>
        </div>
      </div>

      <div className="mt-4">
        <label className="block text-sm font-bold">
          Search customers
          <input
            className="field-input mt-1.5"
            type="search"
            placeholder="Search by name, email or phone"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
      </div>

      {loading && <p className="mt-4 text-sm text-ink-soft">Loading registered customers…</p>}
      {error && (
        <p role="alert" className="mt-3 rounded-lg bg-danger/10 p-3 text-sm text-danger">
          {error}
        </p>
      )}

      {!loading && !filtered.length && (
        <p className="mt-4 text-sm text-ink-soft">No matching customer records found.</p>
      )}

      <ul className="mt-4 max-h-[36rem] divide-y divide-ink/10 overflow-auto">
        {filtered.map((customer) => (
          <li key={customer.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
            <div>
              <p className="font-bold">{customer.name}</p>
              <p className="text-xs text-ink-soft">
                {customer.email} {customer.phone ? `· ${customer.phone}` : ''}
              </p>
              <p className="text-[11px] text-ink-soft">
                Joined: {new Date(customer.createdAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
              </p>
            </div>
            <div className="text-right">
              <span className="rounded-full bg-paper px-3 py-1 text-xs font-bold text-ink">
                {customer._count.orders} order{customer._count.orders === 1 ? '' : 's'}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

