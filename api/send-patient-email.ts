export default async function handler(req: any, res: any) {
  // Only accept POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { to, subject, body } = req.body || {}

  if (!to || !subject || !body) {
    return res.status(400).json({ error: 'Missing required email fields (to, subject, body).' })
  }

  const resendApiKey = process.env.RESEND_API_KEY
  // Resend free tier allows onboarding@resend.dev without requiring custom domain DNS verification
  const senderEmail = process.env.SENDER_EMAIL || 'Prasad Dental Care <onboarding@resend.dev>'

  // Resend HTTP API (No external npm package required)
  if (resendApiKey) {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify({
          from: senderEmail,
          to: [to],
          subject,
          text: body,
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        return res.status(response.status).json({
          error: data.message || 'Email delivery service reported an error',
        })
      }

      return res.status(200).json({ success: true, id: data.id })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Email delivery exception'
      return res.status(500).json({ error: message })
    }
  }

  // Graceful response when email service provider is not yet set in environment
  return res.status(503).json({
    error: 'Email service provider unconfigured. Add RESEND_API_KEY in Vercel environment variables to enable direct outbound email delivery.',
  })
}
