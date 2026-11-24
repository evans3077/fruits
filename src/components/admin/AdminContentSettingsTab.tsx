import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import type { ContentPageDto, FaqDto, StoreSettingsDto, TestimonialDto } from '../../types';

interface AdminContentSettingsTabProps {
  settings: StoreSettingsDto | null;
  pages: ContentPageDto[];
  faqs: FaqDto[];
  testimonials: TestimonialDto[];
  onRefresh: () => Promise<void>;
}

export const AdminContentSettingsTab: React.FC<AdminContentSettingsTabProps> = ({
  settings,
  pages,
  faqs,
  testimonials,
  onRefresh,
}) => {
  const { authFetch, paymentProvider, reloadBootstrap, showToast } = useStore();

  const [settingsForm, setSettingsForm] = useState({
    brandName: settings?.brandName || 'Blendy',
    strapline: settings?.strapline || '',
    announcementText: settings?.announcementText || '',
    announcementEnabled: Boolean(settings?.announcementEnabled),
    supportPhone: settings?.supportPhone || '',
    supportEmail: settings?.supportEmail || '',
    whatsappNumber: settings?.whatsappNumber || '',
    physicalAddress: settings?.physicalAddress || '',
    operatingHours: settings?.operatingHours || '',
    taxLabel: settings?.taxLabel || '',
    taxRateBps: String(settings?.taxRateBps ?? 0),
    allowPayOnDelivery: Boolean(settings?.allowPayOnDelivery),
    allowPayOnPickup: Boolean(settings?.allowPayOnPickup),
  });

  const [editingPageSlug, setEditingPageSlug] = useState<string | null>(null);
  const [pageDraft, setPageDraft] = useState({
    title: '',
    bodyMarkdown: '',
    reviewStatus: 'draft_needs_review' as 'draft_needs_review' | 'approved',
  });

  const [faqForm, setFaqForm] = useState({ category: 'Ordering', question: '', answer: '' });
  const [testiForm, setTestiForm] = useState({ authorName: '', locationLabel: '', quote: '' });

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await authFetch('/api/admin/settings', {
      method: 'PATCH',
      body: JSON.stringify({
        ...settingsForm,
        taxRateBps: Math.max(0, Math.min(3000, Math.round(Number(settingsForm.taxRateBps || 0)))),
      }),
    });
    if (res.ok) {
      await onRefresh();
      await reloadBootstrap(false);
      showToast('Store settings saved.', 'success');
    } else {
      showToast('Could not save settings.', 'error');
    }
  };

  const handleSavePage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPageSlug) return;
    const res = await authFetch(`/api/admin/pages/${encodeURIComponent(editingPageSlug)}`, {
      method: 'PATCH',
      body: JSON.stringify(pageDraft),
    });
    if (res.ok) {
      setEditingPageSlug(null);
      await onRefresh();
      showToast('Page updated.', 'success');
    }
  };

  const handleAddFaq = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await authFetch('/api/admin/faqs', {
      method: 'POST',
      body: JSON.stringify(faqForm),
    });
    if (res.ok) {
      setFaqForm({ category: 'Ordering', question: '', answer: '' });
      await onRefresh();
      await reloadBootstrap(false);
      showToast('FAQ added.', 'success');
    }
  };

  const handleDeleteFaq = async (id: number) => {
    const res = await authFetch(`/api/admin/faqs/${id}`, { method: 'DELETE' });
    if (res.ok) {
      await onRefresh();
      await reloadBootstrap(false);
    }
  };

  const handleAddTestimonial = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await authFetch('/api/admin/testimonials', {
      method: 'POST',
      body: JSON.stringify({ ...testiForm, isApproved: true }),
    });
    if (res.ok) {
      setTestiForm({ authorName: '', locationLabel: '', quote: '' });
      await onRefresh();
      await reloadBootstrap(false);
      showToast('Verified testimonial saved.', 'success');
    }
  };

  const handleToggleTestimonial = async (t: TestimonialDto) => {
    const res = await authFetch(`/api/admin/testimonials/${t.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ isApproved: !t.isApproved }),
    });
    if (res.ok) {
      await onRefresh();
      await reloadBootstrap(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* IntaSend & Launch Status Checklist */}
      <section className="rounded-2xl bg-white border border-zinc-200 p-6 space-y-3">
        <h2 className="text-lg font-bold text-zinc-950">M-Pesa Gateway &amp; Environment Checklist</h2>
        <p className="text-xs text-zinc-600">
          Gateway credentials live strictly in server environment variables (never stored in the browser or database).
        </p>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-2">
          <div className="rounded-xl bg-zinc-50 border border-zinc-200 p-3.5">
            <dt className="text-zinc-500 font-medium">Active Payment Mode</dt>
            <dd className="font-bold text-zinc-950 mt-0.5">{paymentProvider.label}</dd>
          </div>
          <div className="rounded-xl bg-zinc-50 border border-zinc-200 p-3.5">
            <dt className="text-zinc-500 font-medium">IntaSend Webhook URL</dt>
            <dd className="font-mono text-zinc-950 mt-0.5 break-all">
              {typeof window !== 'undefined' ? `${window.location.origin}/api/webhooks/intasend` : '/api/webhooks/intasend'}
            </dd>
          </div>
        </dl>
        <p className="text-xs text-zinc-500">
          Required server env vars for IntaSend: <code>INTASEND_SECRET_KEY</code>,{' '}
          <code>INTASEND_PUBLISHABLE_KEY</code>, <code>INTASEND_WEBHOOK_CHALLENGE</code>.
        </p>
      </section>

      {/* Store Settings */}
      <form
        onSubmit={handleSaveSettings}
        className="rounded-2xl bg-white border border-zinc-200 p-6 space-y-4 text-xs"
      >
        <h2 className="text-lg font-bold text-zinc-950">Store Settings &amp; Contact Info</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="space-y-1">
            <span className="font-semibold">Brand Name</span>
            <input
              type="text"
              value={settingsForm.brandName}
              onChange={(e) => setSettingsForm({ ...settingsForm, brandName: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-zinc-300"
            />
          </label>
          <label className="space-y-1">
            <span className="font-semibold">Strapline</span>
            <input
              type="text"
              value={settingsForm.strapline}
              onChange={(e) => setSettingsForm({ ...settingsForm, strapline: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-zinc-300"
            />
          </label>
          <label className="space-y-1">
            <span className="font-semibold">Support Phone</span>
            <input
              type="text"
              value={settingsForm.supportPhone}
              onChange={(e) => setSettingsForm({ ...settingsForm, supportPhone: e.target.value })}
              placeholder="+2547..."
              className="w-full px-3 py-2 rounded-lg border border-zinc-300"
            />
          </label>
          <label className="space-y-1">
            <span className="font-semibold">Support Email</span>
            <input
              type="email"
              value={settingsForm.supportEmail}
              onChange={(e) => setSettingsForm({ ...settingsForm, supportEmail: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-zinc-300"
            />
          </label>
          <label className="space-y-1">
            <span className="font-semibold">WhatsApp Number</span>
            <input
              type="text"
              value={settingsForm.whatsappNumber}
              onChange={(e) => setSettingsForm({ ...settingsForm, whatsappNumber: e.target.value })}
              placeholder="2547..."
              className="w-full px-3 py-2 rounded-lg border border-zinc-300"
            />
          </label>
          <label className="space-y-1">
            <span className="font-semibold">Operating Hours</span>
            <input
              type="text"
              value={settingsForm.operatingHours}
              onChange={(e) => setSettingsForm({ ...settingsForm, operatingHours: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-zinc-300"
            />
          </label>
          <label className="space-y-1 sm:col-span-2">
            <span className="font-semibold">Physical Location / Kitchen Address</span>
            <input
              type="text"
              value={settingsForm.physicalAddress}
              onChange={(e) => setSettingsForm({ ...settingsForm, physicalAddress: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-zinc-300"
            />
          </label>
          <label className="space-y-1">
            <span className="font-semibold">Tax / VAT Label</span>
            <input
              type="text"
              value={settingsForm.taxLabel}
              onChange={(e) => setSettingsForm({ ...settingsForm, taxLabel: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-zinc-300"
            />
          </label>
          <label className="space-y-1">
            <span className="font-semibold">Tax Rate (basis points, 1600 = 16% VAT)</span>
            <input
              type="number"
              min="0"
              max="3000"
              value={settingsForm.taxRateBps}
              onChange={(e) => setSettingsForm({ ...settingsForm, taxRateBps: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-zinc-300"
            />
          </label>
          <label className="space-y-1 sm:col-span-2">
            <span className="font-semibold">Announcement Banner Text</span>
            <input
              type="text"
              value={settingsForm.announcementText}
              onChange={(e) => setSettingsForm({ ...settingsForm, announcementText: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-zinc-300"
            />
          </label>
        </div>

        <div className="flex flex-wrap gap-6 pt-2">
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={settingsForm.announcementEnabled}
              onChange={(e) =>
                setSettingsForm({ ...settingsForm, announcementEnabled: e.target.checked })
              }
            />
            <span>Show announcement bar</span>
          </label>
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={settingsForm.allowPayOnDelivery}
              onChange={(e) =>
                setSettingsForm({ ...settingsForm, allowPayOnDelivery: e.target.checked })
              }
            />
            <span>Allow Pay on Delivery</span>
          </label>
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={settingsForm.allowPayOnPickup}
              onChange={(e) =>
                setSettingsForm({ ...settingsForm, allowPayOnPickup: e.target.checked })
              }
            />
            <span>Allow Pay on Pickup</span>
          </label>
        </div>

        <button
          type="submit"
          className="px-5 py-2.5 rounded-xl bg-zinc-900 text-white font-semibold cursor-pointer"
        >
          Save Store Settings
        </button>
      </form>

      {/* CMS Pages */}
      <section className="rounded-2xl bg-white border border-zinc-200 p-6 space-y-4">
        <h2 className="text-lg font-bold text-zinc-950">Story &amp; Legal Policy Pages</h2>
        <div className="divide-y divide-zinc-100 text-xs">
          {pages.map((p) => (
            <div key={p.id} className="py-3 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="font-semibold text-zinc-950">
                    {p.title} (/{p.slug})
                  </p>
                  <p className="text-zinc-500">Status: {p.reviewStatus}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEditingPageSlug(editingPageSlug === p.slug ? null : p.slug);
                    setPageDraft({
                      title: p.title,
                      bodyMarkdown: p.bodyMarkdown,
                      reviewStatus: p.reviewStatus,
                    });
                  }}
                  className="px-3 py-1.5 rounded border border-zinc-300 font-semibold cursor-pointer"
                >
                  {editingPageSlug === p.slug ? 'Close' : 'Edit Page'}
                </button>
              </div>
              {editingPageSlug === p.slug && (
                <form onSubmit={handleSavePage} className="space-y-3 bg-zinc-50 p-4 rounded-xl">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      value={pageDraft.title}
                      onChange={(e) => setPageDraft({ ...pageDraft, title: e.target.value })}
                      className="px-3 py-2 rounded border border-zinc-300 bg-white"
                    />
                    <select
                      value={pageDraft.reviewStatus}
                      onChange={(e) =>
                        setPageDraft({
                          ...pageDraft,
                          reviewStatus: e.target.value as 'draft_needs_review' | 'approved',
                        })
                      }
                      className="px-3 py-2 rounded border border-zinc-300 bg-white"
                    >
                      <option value="draft_needs_review">Draft — Needs Owner/Legal Review</option>
                      <option value="approved">Approved for Launch</option>
                    </select>
                  </div>
                  <textarea
                    rows={5}
                    value={pageDraft.bodyMarkdown}
                    onChange={(e) => setPageDraft({ ...pageDraft, bodyMarkdown: e.target.value })}
                    className="w-full px-3 py-2 rounded border border-zinc-300 bg-white"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-zinc-900 text-white font-semibold cursor-pointer"
                  >
                    Save Page
                  </button>
                </form>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* FAQs */}
      <section className="rounded-2xl bg-white border border-zinc-200 p-6 space-y-4 text-xs">
        <h2 className="text-lg font-bold text-zinc-950">FAQs</h2>
        <form onSubmit={handleAddFaq} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input
            type="text"
            required
            placeholder="Category"
            value={faqForm.category}
            onChange={(e) => setFaqForm({ ...faqForm, category: e.target.value })}
            className="px-3 py-2 rounded-lg border border-zinc-300"
          />
          <input
            type="text"
            required
            placeholder="Question"
            value={faqForm.question}
            onChange={(e) => setFaqForm({ ...faqForm, question: e.target.value })}
            className="px-3 py-2 rounded-lg border border-zinc-300 sm:col-span-2"
          />
          <textarea
            rows={2}
            required
            placeholder="Answer"
            value={faqForm.answer}
            onChange={(e) => setFaqForm({ ...faqForm, answer: e.target.value })}
            className="px-3 py-2 rounded-lg border border-zinc-300 sm:col-span-3"
          />
          <button
            type="submit"
            className="sm:col-span-3 justify-self-end px-4 py-2 rounded-lg bg-zinc-900 text-white font-semibold cursor-pointer"
          >
            + Add FAQ
          </button>
        </form>
        <div className="divide-y divide-zinc-100">
          {faqs.map((f) => (
            <div key={f.id} className="py-2.5 flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-zinc-950">{f.question}</p>
                <p className="text-zinc-600">{f.answer}</p>
              </div>
              <button
                type="button"
                onClick={() => handleDeleteFaq(f.id)}
                className="px-3 py-1 rounded border border-red-200 text-red-700 cursor-pointer shrink-0"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials Moderation */}
      <section className="rounded-2xl bg-white border border-zinc-200 p-6 space-y-4 text-xs">
        <h2 className="text-lg font-bold text-zinc-950">Verified Customer Testimonials</h2>
        <form onSubmit={handleAddTestimonial} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input
            type="text"
            required
            placeholder="Customer Name"
            value={testiForm.authorName}
            onChange={(e) => setTestiForm({ ...testiForm, authorName: e.target.value })}
            className="px-3 py-2 rounded-lg border border-zinc-300"
          />
          <input
            type="text"
            placeholder="Location (e.g. Kilimani, Nairobi)"
            value={testiForm.locationLabel}
            onChange={(e) => setTestiForm({ ...testiForm, locationLabel: e.target.value })}
            className="px-3 py-2 rounded-lg border border-zinc-300 sm:col-span-2"
          />
          <input
            type="text"
            required
            placeholder="Verified customer quote"
            value={testiForm.quote}
            onChange={(e) => setTestiForm({ ...testiForm, quote: e.target.value })}
            className="px-3 py-2 rounded-lg border border-zinc-300 sm:col-span-3"
          />
          <button
            type="submit"
            className="sm:col-span-3 justify-self-end px-4 py-2 rounded-lg bg-zinc-900 text-white font-semibold cursor-pointer"
          >
            + Add Verified Quote
          </button>
        </form>
        <div className="divide-y divide-zinc-100">
          {testimonials.map((t) => (
            <div key={t.id} className="py-2.5 flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-zinc-950">
                  {t.authorName} {t.locationLabel ? `· ${t.locationLabel}` : ''}
                </p>
                <p className="text-zinc-600">“{t.quote}”</p>
              </div>
              <button
                type="button"
                onClick={() => handleToggleTestimonial(t)}
                className="px-3 py-1 rounded border border-zinc-300 cursor-pointer shrink-0"
              >
                {t.isApproved ? 'Unpublish' : 'Approve'}
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
