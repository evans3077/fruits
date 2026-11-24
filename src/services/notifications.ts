export interface NotificationDispatchResult {
  channel: 'email' | 'sms';
  status: 'sent' | 'skipped_unconfigured' | 'failed';
  detail: string;
}

export async function dispatchTransactionalNotification(params: {
  channel: 'email' | 'sms';
  recipient: string;
  subject: string;
  message: string;
  orderRef: string;
}): Promise<NotificationDispatchResult> {
  const endpoint =
    params.channel === 'email'
      ? (process.env.EMAIL_WEBHOOK_URL || '').trim()
      : (process.env.SMS_WEBHOOK_URL || '').trim();

  if (!endpoint || !params.recipient) {
    return {
      channel: params.channel,
      status: 'skipped_unconfigured',
      detail: `${params.channel.toUpperCase()} provider is not configured.`,
    };
  }

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipient: params.recipient,
        subject: params.subject,
        message: params.message,
        orderRef: params.orderRef,
      }),
    });
    if (!res.ok) {
      return {
        channel: params.channel,
        status: 'failed',
        detail: `Provider rejected notification (${res.status}).`,
      };
    }
    return {
      channel: params.channel,
      status: 'sent',
      detail: 'Accepted by notification provider.',
    };
  } catch {
    return {
      channel: params.channel,
      status: 'failed',
      detail: 'Network error reaching notification provider.',
    };
  }
}
