import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { Footer } from '../components/Footer';
import { Navbar } from '../components/Navbar';
import { useStore } from '../context/StoreContext';
import { useDocumentMeta } from '../lib/useDocumentMeta';

export const FaqsPage: React.FC = () => {
  const { faqs } = useStore();
  const [openId, setOpenId] = useState<number | null>(null);

  useDocumentMeta(
    'Frequently Asked Questions — Blendy Kenya',
    'Answers about Blendy flavours, M-Pesa STK Push payments, delivery zones, and guest checkout.'
  );

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF9F7] text-zinc-900">
      <Navbar />

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-8 py-12 sm:py-16 space-y-8">
        <div className="space-y-2 border-b border-zinc-200 pb-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
            Help &amp; Guidance
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-zinc-950">
            Frequently Asked Questions
          </h1>
        </div>

        {faqs.length === 0 ? (
          <div className="rounded-2xl bg-white border border-zinc-200 p-8 text-sm text-zinc-600">
            No FAQs published yet. Store staff can add and edit FAQs in Admin.
          </div>
        ) : (
          <div className="space-y-3">
            {faqs.map((faq) => {
              const isOpen = openId === faq.id;
              return (
                <div
                  key={faq.id}
                  className="rounded-2xl bg-white border border-zinc-200 overflow-hidden"
                >
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => setOpenId(isOpen ? null : faq.id)}
                    className="w-full px-6 py-4 text-left flex items-center justify-between gap-4 cursor-pointer hover:bg-zinc-50"
                  >
                    <div>
                      <span className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                        {faq.category}
                      </span>
                      <span className="block text-base font-semibold text-zinc-950 mt-0.5">
                        {faq.question}
                      </span>
                    </div>
                    <ChevronDown
                      className={`w-5 h-5 text-zinc-500 shrink-0 transition-transform ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-6 pb-5 pt-1 text-sm text-zinc-700 leading-relaxed border-t border-zinc-100">
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="rounded-2xl bg-white border border-zinc-200 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-zinc-950">Still need help with an order?</p>
            <p className="text-xs text-zinc-600 mt-0.5">
              Track an existing order by reference or reach the store team.
            </p>
          </div>
          <div className="flex gap-3">
            <Link
              to="/track-order"
              className="px-4 py-2 rounded-lg border border-zinc-300 text-xs font-semibold text-zinc-900 hover:bg-zinc-50"
            >
              Track Order
            </Link>
            <Link
              to="/contact"
              className="px-4 py-2 rounded-lg bg-zinc-900 text-white text-xs font-semibold hover:bg-zinc-800"
            >
              Contact Us
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};
