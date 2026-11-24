import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { formatKsh } from '../../lib/kenya';
import type { ProductDto } from '../../types';

interface AdminCatalogueTabProps {
  products: ProductDto[];
  isManager: boolean;
  onRefresh: () => Promise<void>;
}

export const AdminCatalogueTab: React.FC<AdminCatalogueTabProps> = ({
  products,
  isManager,
  onRefresh,
}) => {
  const { authFetch, reloadBootstrap, showToast } = useStore();
  const [editingProductId, setEditingProductId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    flavour: '',
    status: 'draft' as 'draft' | 'published' | 'archived',
    shortDescription: '',
    description: '',
    ingredientsText: '',
    allergensText: '',
    storageInstructions: '',
    shelfLife: '',
    volumeLabel: '',
    seoTitle: '',
    seoDescription: '',
  });
  const [nutritionRows, setNutritionRows] = useState<Array<{ key: string; value: string }>>([]);

  const [newProdOpen, setNewProdOpen] = useState(false);
  const [newProd, setNewProd] = useState({
    slug: '',
    name: '',
    flavour: 'Berry',
    shortDescription: '',
    sku: '',
    variantLabel: '330ml Bottle',
    priceKes: '0',
    stockQty: '0',
  });

  const [newVariantProductId, setNewVariantProductId] = useState<number | null>(null);
  const [newVarForm, setNewVarForm] = useState({
    sku: '',
    label: '',
    priceKes: '0',
    stockQty: '0',
  });

  const [stockAdjustMap, setStockAdjustMap] = useState<Record<number, { delta: string; reason: string }>>({});
  const [variantPriceMap, setVariantPriceMap] = useState<Record<number, { priceKes: string; label: string }>>({});
  const [busy, setBusy] = useState(false);

  const openEditor = (p: ProductDto) => {
    setEditingProductId(p.id);
    setEditForm({
      name: p.name,
      flavour: p.flavour,
      status: p.status,
      shortDescription: p.shortDescription,
      description: p.description,
      ingredientsText: p.ingredientsText,
      allergensText: p.allergensText,
      storageInstructions: p.storageInstructions,
      shelfLife: p.shelfLife,
      volumeLabel: p.volumeLabel,
      seoTitle: p.seoTitle,
      seoDescription: p.seoDescription,
    });
    const entries = Object.entries(p.nutritionJson || {}).map(([key, value]) => ({ key, value }));
    setNutritionRows(
      entries.length > 0
        ? entries
        : [
            { key: 'Serving Size', value: '330ml' },
            { key: 'Energy', value: '' },
            { key: 'Added Sugar', value: '0g' },
          ]
    );
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProductId) return;
    setBusy(true);
    try {
      const nutritionJson: Record<string, string> = {};
      for (const row of nutritionRows) {
        const k = row.key.trim();
        const v = row.value.trim();
        if (k && v) nutritionJson[k] = v;
      }
      const res = await authFetch(`/api/admin/products/${editingProductId}`, {
        method: 'PATCH',
        body: JSON.stringify({ ...editForm, nutritionJson }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not update product.');
      setEditingProductId(null);
      await onRefresh();
      await reloadBootstrap(false);
      showToast('Product & nutrition saved.', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Save failed.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await authFetch('/api/admin/products', {
        method: 'POST',
        body: JSON.stringify({
          slug: newProd.slug.trim().toLowerCase(),
          name: newProd.name.trim(),
          flavour: newProd.flavour.trim(),
          shortDescription: newProd.shortDescription.trim(),
          sku: newProd.sku.trim().toUpperCase(),
          variantLabel: newProd.variantLabel.trim(),
          priceCents: Math.max(0, Math.round(Number(newProd.priceKes || 0) * 100)),
          stockQty: Math.max(0, Math.round(Number(newProd.stockQty || 0))),
          status: 'draft',
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not create product.');
      setNewProdOpen(false);
      setNewProd({
        slug: '',
        name: '',
        flavour: 'Berry',
        shortDescription: '',
        sku: '',
        variantLabel: '330ml Bottle',
        priceKes: '0',
        stockQty: '0',
      });
      await onRefresh();
      showToast('Draft product created.', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Creation failed.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleSaveVariantPrice = async (variantId: number, currentPriceCents: number, currentLabel: string) => {
    const draft = variantPriceMap[variantId];
    const priceCents = draft
      ? Math.max(0, Math.round(Number(draft.priceKes) * 100))
      : currentPriceCents;
    const label = draft?.label?.trim() || currentLabel;
    setBusy(true);
    try {
      const res = await authFetch(`/api/admin/variants/${variantId}`, {
        method: 'PATCH',
        body: JSON.stringify({ priceCents, label }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not update variant.');
      await onRefresh();
      await reloadBootstrap(false);
      showToast('Variant pricing updated.', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Update failed.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleAdjustStock = async (variantId: number) => {
    const adj = stockAdjustMap[variantId];
    const delta = Math.trunc(Number(adj?.delta || 0));
    const reason = (adj?.reason || 'Manual stock adjustment').trim();
    if (!delta) {
      showToast('Enter a non-zero integer stock delta (e.g. +10 or -2).', 'error');
      return;
    }
    setBusy(true);
    try {
      const res = await authFetch('/api/admin/inventory/adjust', {
        method: 'POST',
        body: JSON.stringify({ variantId, delta, reason }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not adjust stock.');
      setStockAdjustMap((prev) => ({ ...prev, [variantId]: { delta: '', reason: '' } }));
      await onRefresh();
      await reloadBootstrap(false);
      showToast('Stock adjusted.', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Adjustment failed.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleCreateVariant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVariantProductId) return;
    setBusy(true);
    try {
      const res = await authFetch('/api/admin/variants', {
        method: 'POST',
        body: JSON.stringify({
          productId: newVariantProductId,
          sku: newVarForm.sku.trim().toUpperCase(),
          label: newVarForm.label.trim(),
          priceCents: Math.max(0, Math.round(Number(newVarForm.priceKes || 0) * 100)),
          stockQty: Math.max(0, Math.round(Number(newVarForm.stockQty || 0))),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not add variant.');
      setNewVariantProductId(null);
      setNewVarForm({ sku: '', label: '', priceKes: '0', stockQty: '0' });
      await onRefresh();
      showToast('Variant added.', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Add variant failed.', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-zinc-950">Catalogue, Pricing (KES) &amp; Inventory</h2>
          <p className="text-xs text-zinc-600">
            Products in draft remain hidden from public shoppers until published with KSh pricing and stock.
          </p>
        </div>
        {isManager && (
          <button
            type="button"
            onClick={() => setNewProdOpen((v) => !v)}
            className="px-4 py-2 rounded-xl bg-zinc-900 text-white text-xs font-semibold hover:bg-zinc-800 cursor-pointer"
          >
            {newProdOpen ? 'Close' : '+ New Product'}
          </button>
        )}
      </div>

      {newProdOpen && isManager && (
        <form
          onSubmit={handleCreateProduct}
          className="rounded-2xl bg-white border border-zinc-200 p-6 grid grid-cols-1 sm:grid-cols-3 gap-4"
        >
          <input
            type="text"
            required
            placeholder="Name (e.g. Berry 6-Pack)"
            value={newProd.name}
            onChange={(e) => setNewProd({ ...newProd, name: e.target.value })}
            className="px-3 py-2 rounded-lg border border-zinc-300 text-sm"
          />
          <input
            type="text"
            required
            placeholder="Slug (e.g. berry-6-pack)"
            value={newProd.slug}
            onChange={(e) => setNewProd({ ...newProd, slug: e.target.value })}
            className="px-3 py-2 rounded-lg border border-zinc-300 text-sm"
          />
          <input
            type="text"
            required
            placeholder="Flavour (Berry / Kiwi / Banana / Strawberry)"
            value={newProd.flavour}
            onChange={(e) => setNewProd({ ...newProd, flavour: e.target.value })}
            className="px-3 py-2 rounded-lg border border-zinc-300 text-sm"
          />
          <input
            type="text"
            required
            placeholder="SKU (e.g. BL-BRY-6PK)"
            value={newProd.sku}
            onChange={(e) => setNewProd({ ...newProd, sku: e.target.value })}
            className="px-3 py-2 rounded-lg border border-zinc-300 text-sm"
          />
          <input
            type="number"
            min="0"
            placeholder="Price (KSh)"
            value={newProd.priceKes}
            onChange={(e) => setNewProd({ ...newProd, priceKes: e.target.value })}
            className="px-3 py-2 rounded-lg border border-zinc-300 text-sm"
          />
          <input
            type="number"
            min="0"
            placeholder="Initial stock"
            value={newProd.stockQty}
            onChange={(e) => setNewProd({ ...newProd, stockQty: e.target.value })}
            className="px-3 py-2 rounded-lg border border-zinc-300 text-sm"
          />
          <div className="sm:col-span-3 flex justify-end">
            <button
              type="submit"
              disabled={busy}
              className="px-5 py-2 rounded-lg bg-zinc-900 text-white text-xs font-semibold cursor-pointer"
            >
              Create Draft Product
            </button>
          </div>
        </form>
      )}

      {products.map((prod) => (
        <div key={prod.id} className="rounded-2xl bg-white border border-zinc-200 p-5 sm:p-6 space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                {prod.flavour} · /{prod.slug} · Status:{' '}
                <span className={prod.status === 'published' ? 'text-emerald-700' : 'text-amber-700'}>
                  {prod.status}
                </span>
              </p>
              <h3 className="text-lg font-bold text-zinc-950">{prod.name}</h3>
            </div>
            {isManager && (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => openEditor(prod)}
                  className="px-3.5 py-1.5 rounded-lg border border-zinc-300 text-xs font-semibold text-zinc-800 hover:bg-zinc-50 cursor-pointer"
                >
                  Edit Details &amp; Status
                </button>
                <button
                  type="button"
                  onClick={() => setNewVariantProductId(newVariantProductId === prod.id ? null : prod.id)}
                  className="px-3.5 py-1.5 rounded-lg border border-zinc-300 text-xs font-semibold text-zinc-800 hover:bg-zinc-50 cursor-pointer"
                >
                  + Variant
                </button>
              </div>
            )}
          </div>

          {editingProductId === prod.id && (
            <form
              onSubmit={handleSaveProduct}
              className="rounded-xl bg-zinc-50 border border-zinc-200 p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs"
            >
              <label className="space-y-1">
                <span className="font-semibold">Product Name</span>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 bg-white"
                />
              </label>
              <label className="space-y-1">
                <span className="font-semibold">Publish Status</span>
                <select
                  value={editForm.status}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      status: e.target.value as 'draft' | 'published' | 'archived',
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 bg-white"
                >
                  <option value="draft">Draft (Hidden)</option>
                  <option value="published">Published (Live)</option>
                  <option value="archived">Archived</option>
                </select>
              </label>
              <label className="space-y-1 sm:col-span-2">
                <span className="font-semibold">Short Description</span>
                <input
                  type="text"
                  value={editForm.shortDescription}
                  onChange={(e) => setEditForm({ ...editForm, shortDescription: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 bg-white"
                />
              </label>
              <label className="space-y-1 sm:col-span-2">
                <span className="font-semibold">Full Description</span>
                <textarea
                  rows={2}
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 bg-white"
                />
              </label>
              <label className="space-y-1 sm:col-span-2">
                <span className="font-semibold">Verified Ingredients</span>
                <input
                  type="text"
                  value={editForm.ingredientsText}
                  onChange={(e) => setEditForm({ ...editForm, ingredientsText: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 bg-white"
                />
              </label>
              <label className="space-y-1">
                <span className="font-semibold">Allergens</span>
                <input
                  type="text"
                  value={editForm.allergensText}
                  onChange={(e) => setEditForm({ ...editForm, allergensText: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 bg-white"
                />
              </label>
              <label className="space-y-1">
                <span className="font-semibold">Volume Label (e.g. 330ml · 1L)</span>
                <input
                  type="text"
                  value={editForm.volumeLabel}
                  onChange={(e) => setEditForm({ ...editForm, volumeLabel: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 bg-white"
                />
              </label>
              <label className="space-y-1">
                <span className="font-semibold">Storage Instructions</span>
                <input
                  type="text"
                  value={editForm.storageInstructions}
                  onChange={(e) =>
                    setEditForm({ ...editForm, storageInstructions: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 bg-white"
                />
              </label>
              <label className="space-y-1">
                <span className="font-semibold">Shelf Life</span>
                <input
                  type="text"
                  value={editForm.shelfLife}
                  onChange={(e) => setEditForm({ ...editForm, shelfLife: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 bg-white"
                />
              </label>
              <div className="sm:col-span-2 space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">Nutrition Facts</span>
                  <button
                    type="button"
                    onClick={() =>
                      setNutritionRows((rows) => [...rows, { key: '', value: '' }])
                    }
                    className="px-2.5 py-1 rounded border border-zinc-300 bg-white font-semibold hover:bg-zinc-100 cursor-pointer"
                  >
                    + Add Nutrient
                  </button>
                </div>
                <div className="space-y-1.5">
                  {nutritionRows.map((row, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                      <input
                        type="text"
                        placeholder="Nutrient (e.g. Energy)"
                        value={row.key}
                        onChange={(e) =>
                          setNutritionRows((rows) =>
                            rows.map((r, i) => (i === idx ? { ...r, key: e.target.value } : r))
                          )
                        }
                        className="col-span-5 px-2.5 py-1.5 rounded-lg border border-zinc-300 bg-white"
                      />
                      <input
                        type="text"
                        placeholder="Value (e.g. 155 kcal)"
                        value={row.value}
                        onChange={(e) =>
                          setNutritionRows((rows) =>
                            rows.map((r, i) => (i === idx ? { ...r, value: e.target.value } : r))
                          )
                        }
                        className="col-span-5 px-2.5 py-1.5 rounded-lg border border-zinc-300 bg-white"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setNutritionRows((rows) => rows.filter((_, i) => i !== idx))
                        }
                        className="col-span-2 px-2 py-1.5 rounded-lg border border-zinc-300 bg-white text-zinc-600 hover:text-red-600 cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              <div className="sm:col-span-2 flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingProductId(null)}
                  className="px-4 py-2 rounded-lg border border-zinc-300 bg-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="px-4 py-2 rounded-lg bg-zinc-900 text-white font-semibold cursor-pointer"
                >
                  Save Product
                </button>
              </div>
            </form>
          )}

          {newVariantProductId === prod.id && (
            <form
              onSubmit={handleCreateVariant}
              className="rounded-xl bg-zinc-50 border border-zinc-200 p-4 grid grid-cols-1 sm:grid-cols-5 gap-2.5 text-xs items-end"
            >
              <input
                type="text"
                required
                placeholder="SKU"
                value={newVarForm.sku}
                onChange={(e) => setNewVarForm({ ...newVarForm, sku: e.target.value })}
                className="px-3 py-2 rounded-lg border border-zinc-300 bg-white"
              />
              <input
                type="text"
                required
                placeholder="Label (e.g. 500ml)"
                value={newVarForm.label}
                onChange={(e) => setNewVarForm({ ...newVarForm, label: e.target.value })}
                className="px-3 py-2 rounded-lg border border-zinc-300 bg-white"
              />
              <input
                type="number"
                min="0"
                required
                placeholder="Price (KSh)"
                value={newVarForm.priceKes}
                onChange={(e) => setNewVarForm({ ...newVarForm, priceKes: e.target.value })}
                className="px-3 py-2 rounded-lg border border-zinc-300 bg-white"
              />
              <input
                type="number"
                min="0"
                required
                placeholder="Stock"
                value={newVarForm.stockQty}
                onChange={(e) => setNewVarForm({ ...newVarForm, stockQty: e.target.value })}
                className="px-3 py-2 rounded-lg border border-zinc-300 bg-white"
              />
              <button
                type="submit"
                disabled={busy}
                className="px-4 py-2 rounded-lg bg-zinc-900 text-white font-semibold cursor-pointer"
              >
                Add Variant
              </button>
            </form>
          )}

          {/* Variants Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-zinc-200 text-zinc-500">
                  <th className="py-2 pr-3">SKU</th>
                  <th className="py-2 pr-3">Option Label</th>
                  <th className="py-2 pr-3">Price (KSh)</th>
                  <th className="py-2 pr-3">Stock (Avail / Res)</th>
                  <th className="py-2">Stock Adjustment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {prod.variants.map((v) => {
                  const vp = variantPriceMap[v.id] ?? {
                    priceKes: String(Math.round(v.priceCents / 100)),
                    label: v.label,
                  };
                  const adj = stockAdjustMap[v.id] ?? { delta: '', reason: '' };
                  return (
                    <tr key={v.id} className="align-middle">
                      <td className="py-2.5 pr-3 font-mono text-zinc-700">{v.sku}</td>
                      <td className="py-2.5 pr-3">
                        {isManager ? (
                          <input
                            type="text"
                            value={vp.label}
                            onChange={(e) =>
                              setVariantPriceMap((prev) => ({
                                ...prev,
                                [v.id]: { ...vp, label: e.target.value },
                              }))
                            }
                            className="w-40 px-2.5 py-1.5 rounded border border-zinc-300"
                          />
                        ) : (
                          v.label
                        )}
                      </td>
                      <td className="py-2.5 pr-3">
                        {isManager ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              min="0"
                              value={vp.priceKes}
                              onChange={(e) =>
                                setVariantPriceMap((prev) => ({
                                  ...prev,
                                  [v.id]: { ...vp, priceKes: e.target.value },
                                }))
                              }
                              className="w-24 px-2.5 py-1.5 rounded border border-zinc-300 tabular-nums"
                            />
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => handleSaveVariantPrice(v.id, v.priceCents, v.label)}
                              className="px-2.5 py-1.5 rounded bg-zinc-900 text-white font-semibold cursor-pointer"
                            >
                              Save
                            </button>
                          </div>
                        ) : (
                          formatKsh(v.priceCents)
                        )}
                      </td>
                      <td className="py-2.5 pr-3 tabular-nums">
                        <strong>{v.availableQty}</strong> avail ({v.stockQty} total / {v.reservedQty} res)
                      </td>
                      <td className="py-2.5">
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            placeholder="+10 / -2"
                            value={adj.delta}
                            onChange={(e) =>
                              setStockAdjustMap((prev) => ({
                                ...prev,
                                [v.id]: { ...adj, delta: e.target.value },
                              }))
                            }
                            className="w-20 px-2 py-1.5 rounded border border-zinc-300"
                          />
                          <input
                            type="text"
                            placeholder="Reason"
                            value={adj.reason}
                            onChange={(e) =>
                              setStockAdjustMap((prev) => ({
                                ...prev,
                                [v.id]: { ...adj, reason: e.target.value },
                              }))
                            }
                            className="w-28 px-2 py-1.5 rounded border border-zinc-300"
                          />
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => handleAdjustStock(v.id)}
                            className="px-2.5 py-1.5 rounded border border-zinc-300 font-semibold hover:bg-zinc-50 cursor-pointer"
                          >
                            Apply
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
};
