import axios from 'axios';

interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export interface EmailDeliveryResult {
  delivered: boolean;
  mode: 'email' | 'preview';
  reason?: string;
  status?: number;
}

export async function sendTransactionalEmail(payload: EmailPayload) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey || !from) {
    if (process.env.NODE_ENV !== 'production') {
      console.info('[email-preview]', {
        to: payload.to,
        subject: payload.subject,
        text: payload.text,
      });
    }

    return {
      delivered: false,
      mode: 'preview' as const,
      reason: 'Email delivery is not configured for this environment.',
    };
  }

  try {
    await axios.post(
      'https://api.resend.com/emails',
      {
        from,
        to: [payload.to],
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 15000,
      }
    );
  } catch (error: any) {
    const status = error?.response?.status;
    const providerMessage =
      error?.response?.data?.message ||
      error?.response?.data?.error ||
      error?.message ||
      'Email delivery failed';

    console.error('[email-delivery-failed]', {
      to: payload.to,
      subject: payload.subject,
      status,
      providerMessage,
    });

    return {
      delivered: false,
      mode: 'preview' as const,
      reason: providerMessage,
      status,
    };
  }

  return {
    delivered: true,
    mode: 'email' as const,
  };
}
