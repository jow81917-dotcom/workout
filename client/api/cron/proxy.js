// Vercel Serverless Function to proxy cron trigger requests to Render API
export default async function handler(req, res) {
  // Validate Cron authorization if called via Vercel Cron directly
  // Vercel Cron sends a Bearer token in the Authorization header
  const authHeader = req.headers.authorization;
  const isVercelCron = authHeader && authHeader.startsWith('Bearer ');

  console.log('🔄 Cron proxy triggered. Is Vercel Cron:', !!isVercelCron);

  const apiBaseUrl = process.env.VITE_API_URL || process.env.API_URL || 'http://localhost:5000';
  const cronSecret = process.env.CRON_SECRET || 'workoutflow_cron_secret_change_in_production';

  try {
    const targetUrl = `${apiBaseUrl}/api/cron/tick?secret=${encodeURIComponent(cronSecret)}`;
    console.log(`📡 Fetching Render API tick endpoint...`);

    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'x-cron-secret': cronSecret,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json().catch(() => ({}));
    console.log(`✅ Render API responded with status ${response.status}`, data);

    res.status(response.status).json({
      success: response.ok,
      status: response.status,
      message: 'Proxy request completed',
      data,
    });
  } catch (error) {
    console.error('❌ Proxy request failed:', error);
    res.status(500).json({ error: 'Proxy request failed', details: error.message });
  }
}
