import React, { useState } from 'react';
import { Footer } from '../components/Footer';
import { Navbar } from '../components/Navbar';
import { useStore } from '../context/StoreContext';
import { useDocumentMeta } from '../lib/useDocumentMeta';

export const ContactPage: React.FC = () => {
  const { settings, showToast } = useStore();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [resultNote, setResultNote] = useState<string | null>(null);

  useDocumentMeta(
    'Contact — Blendy Kenya',
    'Get in touch with the Blendy Kenya team for orders, delivery, and support.'
  );

  const whatsappDigits = (settings?.whatsappNumber || '').replace(/\D/g, '');
  const whatsappLink = whatsappDigits
    ? `https://wa.me/${whatsappDigits.startsWith('0') ? `254${whatsappDigits.slice(1)}` : whatsappDigits}`
    : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setResultNote(null);
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone, message }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not send message.');
      setResultNote(data.note || 'Message submitted.');
      setName('');
      setEmail('');
      setPhone('');
      setMessage('');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to send message.', 'error');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF9F7] text-zinc-900">
      <Navbar />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-8 py-12 sm:py-16 grid grid-cols-1 md:grid-cols-12 gap-10">
        <div className="md:col-span-5 space-y-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
            Customer Support
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-950">Contact Blendy</h1>
          <p className="text-sm text-zinc-600 leading-relaxed">
            Reach out about active orders, delivery availability, wholesale enquiries, or feedback.
          </p>

          <div className="rounded-2xl bg-white border border-zinc-200 p-5 space-y-3 text-sm">
            {settings?.supportPhone ||
            settings?.supportEmail ||
            settings?.physicalAddress ||
            whatsappLink ? (
              <>
                {settings?.supportPhone && (
                  <div>
                    <p className="text-xs font-semibold text-zinc-500 uppercase">Phone</p>
                    <p className="font-medium text-zinc-950">{settings.supportPhone}</p>
                  </div>
                )}
                {settings?.supportEmail && (
                  <div>
                    <p className="text-xs font-semibold text-zinc-500 uppercase">Email</p>
                    <p className="font-medium text-zinc-950">{settings.supportEmail}</p>
                  </div>
                )}
                {settings?.physicalAddress && (
                  <div>
                    <p className="text-xs font-semibold text-zinc-500 uppercase">Location</p>
                    <p className="font-medium text-zinc-950">{settings.physicalAddress}</p>
                  </div>
                )}
                {settings?.operatingHours && (
                  <div>
                    <p className="text-xs font-semibold text-zinc-500 uppercase">Hours</p>
                    <p className="font-medium text-zinc-950">{settings.operatingHours}</p>
                  </div>
                )}
                {whatsappLink && (
                  <div className="pt-2">
                    <a
                      href={whatsappLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-4 py-2.5 rounded-xl bg-emerald-700 text-white text-xs font-semibold hover:bg-emerald-800"
                    >
                      Message on WhatsApp
                    </a>
                  </div>
                )}
              </>
            ) : (
              <p className="text-xs text-zinc-500">
                Direct store phone, email, address, and WhatsApp details have not been configured in
                Admin Settings yet.
              </p>
            )}
          </div>
        </div>

        <div className="md:col-span-7">
          <form
            onSubmit={handleSubmit}
            className="rounded-2xl bg-white border border-zinc-200 p-6 sm:p-8 space-y-4"
          >
            <h2 className="text-lg font-semibold text-zinc-950">Send a Message</h2>

            {resultNote && (
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3.5 text-xs text-zinc-800">
                {resultNote}
              </div>
            )}

            <div className="space-y-1">
              <label htmlFor="contact-name" className="text-xs font-medium text-zinc-700">
                Full Name *
              </label>
              <input
                id="contact-name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 text-sm focus:outline-none focus:border-zinc-950"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label htmlFor="contact-phone" className="text-xs font-medium text-zinc-700">
                  Mobile Number (optional)
                </label>
                <input
                  id="contact-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0712 345 678"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 text-sm focus:outline-none focus:border-zinc-950"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="contact-email" className="text-xs font-medium text-zinc-700">
                  Email (optional)
                </label>
                <input
                  id="contact-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 text-sm focus:outline-none focus:border-zinc-950"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label htmlFor="contact-msg" className="text-xs font-medium text-zinc-700">
                Message *
              </label>
              <textarea
                id="contact-msg"
                rows={4}
                required
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 text-sm focus:outline-none focus:border-zinc-950"
              />
            </div>

            <button
              type="submit"
              disabled={sending}
              className="px-6 py-3 rounded-xl bg-zinc-900 text-white text-sm font-semibold hover:bg-zinc-800 disabled:opacity-50 cursor-pointer"
            >
              {sending ? 'Sending...' : 'Send Message'}
            </button>
          </form>
        </div>
      </main>

      <Footer />
    </div>
  );
};
