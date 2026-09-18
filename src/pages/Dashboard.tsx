import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase, type InventoryItemWithCategory, type Category } from '@/lib/supabase';
import {
  Package, Plus, Search, Pencil, Trash2, LogOut, AlertTriangle, AlertCircle,
  TrendingUp, DollarSign, Boxes, X, Tag, LayoutGrid,
} from 'lucide-react';

type FormState = {
  name: string;
  sku: string;
  description: string;
  category_id: string;
  quantity: string;
  price: string;
  low_stock_threshold: string;
};

const emptyForm: FormState = {
  name: '',
  sku: '',
  description: '',
  category_id: '',
  quantity: '0',
  price: '0',
  low_stock_threshold: '10',
};

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const [items, setItems] = useState<InventoryItemWithCategory[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [activeView, setActiveView] = useState<'inventory' | 'categories'>('inventory');

  const loadData = async () => {
    setLoading(true);
    const [itemsRes, catRes] = await Promise.all([
      supabase
        .from('inventory_items')
        .select('*, categories(name)')
        .order('created_at', { ascending: false }),
      supabase.from('categories').select('*').order('name', { ascending: true }),
    ]);
    if (itemsRes.data) setItems(itemsRes.data as InventoryItemWithCategory[]);
    if (catRes.data) setCategories(catRes.data as Category[]);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        (item.sku ?? '').toLowerCase().includes(search.toLowerCase());
      const matchesCat = filterCategory === 'all' || item.category_id === filterCategory;
      return matchesSearch && matchesCat;
    });
  }, [items, search, filterCategory]);

  const stats = useMemo(() => {
    const totalItems = items.length;
    const totalStock = items.reduce((sum, i) => sum + i.quantity, 0);
    const totalValue = items.reduce((sum, i) => sum + i.quantity * Number(i.price), 0);
    const lowStock = items.filter((i) => i.quantity <= i.low_stock_threshold).length;
    return { totalItems, totalStock, totalValue, lowStock };
  }, [items]);

  const openAdd = () => {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(true);
  };

  const openEdit = (item: InventoryItemWithCategory) => {
    setForm({
      name: item.name,
      sku: item.sku ?? '',
      description: item.description ?? '',
      category_id: item.category_id ?? '',
      quantity: String(item.quantity),
      price: String(item.price),
      low_stock_threshold: String(item.low_stock_threshold),
    });
    setEditingId(item.id);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    const payload = {
      name: form.name,
      sku: form.sku || null,
      description: form.description || null,
      category_id: form.category_id || null,
      quantity: parseInt(form.quantity) || 0,
      price: parseFloat(form.price) || 0,
      low_stock_threshold: parseInt(form.low_stock_threshold) || 0,
    };

    if (editingId) {
      const { error } = await supabase.from('inventory_items').update(payload).eq('id', editingId);
      if (error) setError(error.message);
    } else {
      const { error } = await supabase.from('inventory_items').insert(payload);
      if (error) setError(error.message);
    }

    if (!error) {
      setShowForm(false);
      await loadData();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this item? This cannot be undone.')) return;
    const { error } = await supabase.from('inventory_items').delete().eq('id', id);
    if (error) {
      setError(error.message);
      return;
    }
    await loadData();
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategory.trim()) return;
    const { error } = await supabase.from('categories').insert({ name: newCategory.trim() });
    if (error) {
      setError(error.message);
      return;
    }
    setNewCategory('');
    await loadData();
  };

  const handleDeleteCategory = async (id: string) => {
    const itemCount = items.filter((i) => i.category_id === id).length;
    const msg = itemCount > 0
      ? `This category has ${itemCount} item(s). Deleting it will unlink them. Continue?`
      : 'Delete this category?';
    if (!confirm(msg)) return;
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) { setError(error.message); return; }
    await loadData();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Ambient background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-slate-800 bg-slate-900/50 backdrop-blur-xl sticky top-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Package className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">StockFlow</h1>
              <p className="text-xs text-slate-500 hidden sm:block">Inventory Management</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-400 hidden sm:block">{user?.email}</span>
            <button
              onClick={signOut}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white text-sm font-medium transition-all border border-slate-700"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard icon={Boxes} label="Total Items" value={stats.totalItems} color="emerald" />
          <StatCard icon={TrendingUp} label="Total Stock" value={stats.totalStock} color="cyan" />
          <StatCard icon={DollarSign} label="Inventory Value" value={`$${stats.totalValue.toFixed(2)}`} color="teal" />
          <StatCard icon={AlertTriangle} label="Low Stock" value={stats.lowStock} color="amber" />
        </div>

        {/* View toggle */}
        <div className="flex gap-1 p-1 bg-slate-900/60 rounded-xl mb-6 w-fit border border-slate-800">
          <button
            onClick={() => setActiveView('inventory')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeView === 'inventory'
                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            Inventory
          </button>
          <button
            onClick={() => setActiveView('categories')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeView === 'categories'
                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Tag className="w-4 h-4" />
            Categories
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 mb-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
            <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-300">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {activeView === 'inventory' ? (
          <>
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search by name or SKU..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-slate-900/60 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                />
              </div>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="px-4 py-3 bg-slate-900/60 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500 transition-all min-w-[160px]"
              >
                <option value="all">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <button
                onClick={openAdd}
                className="flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-medium rounded-xl hover:from-emerald-400 hover:to-teal-500 transition-all shadow-lg shadow-emerald-500/20 whitespace-nowrap"
              >
                <Plus className="w-5 h-5" />
                Add Item
              </button>
            </div>

            {/* Table / Cards */}
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-8 h-8 border-2 border-slate-700 border-t-emerald-500 rounded-full animate-spin" />
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="text-center py-20">
                <Package className="w-16 h-16 text-slate-700 mx-auto mb-4" />
                <p className="text-slate-400 text-lg font-medium">No items found</p>
                <p className="text-slate-600 text-sm mt-1">
                  {items.length === 0 ? 'Add your first inventory item to get started.' : 'Try adjusting your search or filter.'}
                </p>
              </div>
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden lg:block bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-800 bg-slate-900/60">
                        <th className="text-left px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Item</th>
                        <th className="text-left px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">SKU</th>
                        <th className="text-left px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Category</th>
                        <th className="text-right px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Qty</th>
                        <th className="text-right px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Price</th>
                        <th className="text-right px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Value</th>
                        <th className="text-center px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                        <th className="text-right px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredItems.map((item) => {
                        const isLow = item.quantity <= item.low_stock_threshold;
                        return (
                          <tr key={item.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                            <td className="px-6 py-4">
                              <div className="font-medium text-white">{item.name}</div>
                              {item.description && (
                                <div className="text-xs text-slate-500 mt-0.5 line-clamp-1">{item.description}</div>
                              )}
                            </td>
                            <td className="px-6 py-4 text-sm text-slate-400 font-mono">{item.sku || '—'}</td>
                            <td className="px-6 py-4">
                              {item.categories ? (
                                <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 text-xs font-medium">
                                  {item.categories.name}
                                </span>
                              ) : (
                                <span className="text-slate-600 text-sm">—</span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-right font-medium text-white">{item.quantity}</td>
                            <td className="px-6 py-4 text-right text-slate-300">${Number(item.price).toFixed(2)}</td>
                            <td className="px-6 py-4 text-right text-slate-300">${(item.quantity * Number(item.price)).toFixed(2)}</td>
                            <td className="px-6 py-4 text-center">
                              {isLow ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-400 text-xs font-medium">
                                  <AlertTriangle className="w-3 h-3" />
                                  Low
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-400 text-xs font-medium">
                                  In Stock
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => openEdit(item)}
                                  className="p-2 rounded-lg bg-slate-800/60 hover:bg-slate-700 text-slate-400 hover:text-white transition-all"
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDelete(item.id)}
                                  className="p-2 rounded-lg bg-slate-800/60 hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-all"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile cards */}
                <div className="lg:hidden space-y-3">
                  {filteredItems.map((item) => {
                    const isLow = item.quantity <= item.low_stock_threshold;
                    return (
                      <div key={item.id} className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="font-medium text-white">{item.name}</h3>
                            {item.sku && <p className="text-xs text-slate-500 font-mono mt-0.5">{item.sku}</p>}
                          </div>
                          {isLow ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500/15 text-amber-400 text-xs font-medium">
                              <AlertTriangle className="w-3 h-3" />
                              Low
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-500/15 text-emerald-400 text-xs font-medium">
                              In Stock
                            </span>
                          )}
                        </div>
                        {item.categories && (
                          <span className="inline-block px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-xs mb-3">
                            {item.categories.name}
                          </span>
                        )}
                        <div className="flex items-center justify-between text-sm">
                          <div className="text-slate-400">
                            Qty: <span className="text-white font-medium">{item.quantity}</span>
                            <span className="mx-2 text-slate-700">|</span>
                            ${Number(item.price).toFixed(2)}
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => openEdit(item)}
                              className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(item.id)}
                              className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-red-400"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </>
        ) : (
          /* Categories view */
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6">
            <form onSubmit={handleAddCategory} className="flex gap-3 mb-6">
              <input
                type="text"
                placeholder="New category name..."
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="flex-1 px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
              />
              <button
                type="submit"
                className="flex items-center gap-2 px-5 py-3 bg-emerald-500 text-white font-medium rounded-xl hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20"
              >
                <Plus className="w-5 h-5" />
                Add
              </button>
            </form>
            {categories.length === 0 ? (
              <div className="text-center py-12">
                <Tag className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                <p className="text-slate-400">No categories yet. Create one above.</p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {categories.map((cat) => {
                  const count = items.filter((i) => i.category_id === cat.id).length;
                  return (
                    <div key={cat.id} className="flex items-center justify-between p-4 bg-slate-800/40 border border-slate-800 rounded-xl">
                      <div>
                        <p className="font-medium text-white">{cat.name}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{count} item{count !== 1 ? 's' : ''}</p>
                      </div>
                      <button
                        onClick={() => handleDeleteCategory(cat.id)}
                        className="p-2 rounded-lg hover:bg-red-500/20 text-slate-500 hover:text-red-400 transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Item form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-slate-800">
              <h2 className="text-xl font-bold">{editingId ? 'Edit Item' : 'Add New Item'}</h2>
              <button onClick={() => setShowForm(false)} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Name *</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                  placeholder="Product name"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">SKU</label>
                  <input
                    type="text"
                    value={form.sku}
                    onChange={(e) => setForm({ ...form, sku: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                    placeholder="SKU-001"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Category</label>
                  <select
                    value={form.category_id}
                    onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-emerald-500 transition-all"
                  >
                    <option value="">None</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all resize-none"
                  placeholder="Optional description"
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Quantity *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={form.quantity}
                    onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Price *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Low Stock Alert</label>
                  <input
                    type="number"
                    min="0"
                    value={form.low_stock_threshold}
                    onChange={(e) => setForm({ ...form, low_stock_threshold: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                  />
                </div>
              </div>
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 py-3 bg-slate-800 text-slate-300 font-medium rounded-xl hover:bg-slate-700 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-medium rounded-xl hover:from-emerald-400 hover:to-teal-500 transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingId ? 'Update' : 'Add Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  color: 'emerald' | 'cyan' | 'teal' | 'amber';
}) {
  const colorMap = {
    emerald: 'from-emerald-400 to-emerald-600 text-emerald-400',
    cyan: 'from-cyan-400 to-cyan-600 text-cyan-400',
    teal: 'from-teal-400 to-teal-600 text-teal-400',
    amber: 'from-amber-400 to-amber-600 text-amber-400',
  };
  const [grad, text] = colorMap[color].split(' text-');

  return (
    <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-all">
      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${grad} flex items-center justify-center mb-3 shadow-lg`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-sm text-slate-500 mt-0.5">{label}</p>
    </div>
  );
}
