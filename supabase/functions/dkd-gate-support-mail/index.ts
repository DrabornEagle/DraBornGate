import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

type DkdSupportPayload = {
  fullName?: string
  email?: string
  plate?: string
  supportType?: string
  details?: string
  appVersion?: string
  androidVersionCode?: number
  deviceInfo?: Record<string, unknown>
}

const dkdCors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function dkdJson(payload: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...dkdCors, 'Content-Type': 'application/json; charset=utf-8' },
  })
}

function dkdEscape(value: unknown) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return dkdJson({ ok: true })
  if (request.method !== 'POST') return dkdJson({ ok: false, message: 'Yalnızca POST desteklenir.' }, 405)

  const dkdSupabaseUrl = Deno.env.get('SUPABASE_URL') || ''
  const dkdAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || ''
  const dkdServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('DKD_SUPABASE_SERVICE_ROLE_KEY') || ''
  const dkdAuthorization = request.headers.get('authorization') || ''
  if (!dkdSupabaseUrl || !dkdAnonKey || !dkdServiceKey) return dkdJson({ ok: false, message: 'Sunucu yapılandırması eksik.' }, 500)

  const dkdUserClient = createClient(dkdSupabaseUrl, dkdAnonKey, { global: { headers: { Authorization: dkdAuthorization } } })
  const dkdServiceClient = createClient(dkdSupabaseUrl, dkdServiceKey)
  const { data: dkdUserData, error: dkdUserError } = await dkdUserClient.auth.getUser()
  if (dkdUserError || !dkdUserData.user) return dkdJson({ ok: false, message: 'Oturum gerekli.' }, 401)

  const dkdPayload = await request.json().catch(() => ({})) as DkdSupportPayload
  const { data: dkdRequestId, error: dkdCreateError } = await dkdUserClient.rpc('dkd_gate_create_support_request', {
    dkd_param_full_name: dkdPayload.fullName || '',
    dkd_param_email: dkdPayload.email || dkdUserData.user.email || '',
    dkd_param_plate: dkdPayload.plate || '',
    dkd_param_support_type: dkdPayload.supportType || 'Uygulama hatası',
    dkd_param_details: dkdPayload.details || '',
    dkd_param_app_version: dkdPayload.appVersion || '0.3.12',
    dkd_param_android_version_code: Number(dkdPayload.androidVersionCode || 2),
    dkd_param_device_info: dkdPayload.deviceInfo || {},
  })
  if (dkdCreateError || !dkdRequestId) return dkdJson({ ok: false, message: dkdCreateError?.message || 'Destek talebi kaydedilemedi.' }, 400)

  const dkdResendKey = Deno.env.get('RESEND_API_KEY') || Deno.env.get('DKD_RESEND_API_KEY') || ''
  const dkdFromEmail = Deno.env.get('DKD_SUPPORT_FROM_EMAIL') || 'DraBornGate Destek <support@draborneagle.com>'
  const dkdTargetEmail = 'support@draborneagle.com'
  let dkdMailSent = false
  let dkdMailError = ''

  if (dkdResendKey) {
    const dkdSubject = `[DraBornGate Destek] ${dkdPayload.supportType || 'Uygulama hatası'} • ${dkdPayload.fullName || 'Kullanıcı'}`
    const dkdHtml = `
      <div style="font-family:Arial,sans-serif;max-width:680px;margin:auto;color:#102033">
        <h2>DraBornGate destek talebi</h2>
        <p><strong>Talep No:</strong> ${dkdEscape(dkdRequestId)}</p>
        <p><strong>Ad Soyad:</strong> ${dkdEscape(dkdPayload.fullName)}</p>
        <p><strong>E-posta:</strong> ${dkdEscape(dkdPayload.email || dkdUserData.user.email)}</p>
        <p><strong>Plaka:</strong> ${dkdEscape(dkdPayload.plate || '-')}</p>
        <p><strong>Destek Türü:</strong> ${dkdEscape(dkdPayload.supportType)}</p>
        <p><strong>Uygulama:</strong> v${dkdEscape(dkdPayload.appVersion || '0.3.12')} • Android kodu ${dkdEscape(dkdPayload.androidVersionCode || 2)}</p>
        <hr />
        <p style="white-space:pre-wrap">${dkdEscape(dkdPayload.details)}</p>
      </div>`
    try {
      const dkdMailResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${dkdResendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: dkdFromEmail,
          to: [dkdTargetEmail],
          reply_to: dkdPayload.email || dkdUserData.user.email,
          subject: dkdSubject,
          html: dkdHtml,
        }),
      })
      const dkdMailResult = await dkdMailResponse.json().catch(() => ({}))
      dkdMailSent = dkdMailResponse.ok
      if (!dkdMailSent) dkdMailError = String(dkdMailResult?.message || `Resend HTTP ${dkdMailResponse.status}`)
    } catch (error) {
      dkdMailError = error instanceof Error ? error.message : 'E-posta gönderilemedi.'
    }
  } else {
    dkdMailError = 'RESEND_API_KEY tanımlı değil.'
  }

  await dkdServiceClient
    .schema('draborngate')
    .from('dkd_gate_support_requests')
    .update({ mail_status: dkdMailSent ? 'sent' : 'failed', mail_error: dkdMailError || null, updated_at: new Date().toISOString() })
    .eq('id', dkdRequestId)
    .eq('user_id', dkdUserData.user.id)

  return dkdJson({
    ok: true,
    requestId: dkdRequestId,
    mailSent: dkdMailSent,
    message: dkdMailSent
      ? 'Destek talebin kaydedildi ve destek ekibine e-posta gönderildi.'
      : 'Destek talebin kaydedildi. E-posta servisi yapılandırması kontrol edilecek.',
  })
})
