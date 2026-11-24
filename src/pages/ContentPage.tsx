import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Footer } from '../components/Footer';
import { Navbar } from '../components/Navbar';
import { useDocumentMeta } from '../lib/useDocumentMeta';
import type { ContentPageDto } from '../types';

interface ContentPageProps {
  slug: string;
}

export const ContentPage: React.FC<ContentPageProps> = ({ slug }) => {
  const [page, setPage] = useState<ContentPageDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useDocumentMeta(
    page ? page.seoTitle || `${page.title} — Blendy` : 'Blendy',
    page?.seoDescription || 'Blendy Kenya store information.'
  );

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/pages/${encodeURIComponent(slug)}`);
        if (!res.ok) throw new Error('Page not found.');
        const data = await res.json();
        if (!active) return;
        setPage(data.page);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Unable to load page.');
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [slug]);

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF9F7] text-zinc-900">
      <Navbar />

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-8 py-12 sm:py-16">
        {loading ? (
          <div className="space-y-4">
            <div className="h-9 w-1/2 bg-zinc-200 rounded animate-pulse" />
            <div className="h-40 w-full bg-zinc-200 rounded animate-pulse" />
          </div>
        ) : error || !page ? (
          <div className="rounded-2xl bg-white border border-zinc-200 p-8 text-center space-y-3">
            <h1 className="text-2xl font-bold">{error || 'Page not found'}</h1>
            <Link to="/" className="text-sm font-semibold underline">
              Return Home
            </Link>
          </div>
        ) : (
          <article className="space-y-6">
            {page.reviewStatus === 'draft_needs_review' && (
              <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-xs sm:text-sm text-amber-950">
                <strong>Draft Notice:</strong> This page is a starter template pending store owner
                or legal review in{' '}
                <Link to="/admin" className="underline font-semibold">
                  Admin → Content &amp; Settings
                </Link>
                .
              </div>
            )}

            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-zinc-950">
              {page.title}
            </h1>

            <div className="bg-white rounded-2xl border border-zinc-200 p-6 sm:p-8 text-zinc-700 leading-relaxed whitespace-pre-line text-sm sm:text-base">
              {page.bodyMarkdown}
            </div>
          </article>
        )}
      </main>

      <Footer />
    </div>
  );
};
