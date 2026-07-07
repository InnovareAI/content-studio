'use client'

// Per-client API keys. A client manages its OWN provider keys inside its OWN
// space (scoped to the active project). Saving goes through the client-secrets
// function (which authorizes via canManageProject — the space owner / org
// admins); listing + revoking are direct, gated by client_api_keys RLS.
//
// This page is keys only. Generation policy, model defaults, and the budget cap
// live in Settings → Brain & Models (see GenerationSettings).
import { useCallback, useEffect, useState } from 'react'
import { KeyRound, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/components/providers/AuthProvider'
import { useProject } from '@/components/providers/ProjectProvider'
import { PageHeader, SectionLabel, Button, Field, Input, Select, Textarea, color, space, type as t, radius, useToast } from '@/design'

type ClientApiKey = {
  id: string
  provider: string
  label: string
  secret_preview: string | null
  status: 'active' | 'invalid' | 'revoked'
  last_used_at: string | null
  created_at: string
}

const PROVIDERS = [
  { value: 'openrouter', label: 'OpenRouter (text + images)' },
  { value: 'anthropic', label: 'Anthropic (text)' },
  { value: 'openai', label: 'OpenAI (images + embeddings)' },
  { value: 'fal', label: 'FAL (images + video)' },
]
const providerLabel = (v: string) => PROVIDERS.find(p => p.value === v)?.label ?? v

export default function ClientKeys() {
  const { activeProject } = useProject()
  const { session } = useAuth()
  const { push } = useToast()
  const [keys, setKeys] = useState<ClientApiKey[]>([])
  const [loading, setLoading] = useState(true)
  const [provider, setProvider] = useState('openrouter')
  const [label, setLabel] = useState('')
  const [secret, setSecret] = useState('')
  const [config, setConfig] = useState('')
  const [saving, setSaving] = useState(false)

  // Per-space model choices, stored in projects.ai_policy. Text and reasoning
  // are OpenRouter slugs; image is an image-model alias.
  const [textModel, setTextModel] = useState('')
  const [reasoningModel, setReasoningModel] = useState('')
  const [imageModel, setImageModel] = useState('')
  const [savingModels, setSavingModels] = useState(false)

  useEffect(() => {
    const ap = (activeProject?.ai_policy ?? {}) as Record<string, unknown>
    setTextModel((ap.default_text_model as string) ?? '')
    setReasoningModel((ap.default_reasoning_model as string) ?? '')
    setImageModel((ap.default_image_model as string) ?? '')
  }, [activeProject?.id, activeProject?.ai_policy])

  const load = useCallback(async () => {
    if (!activeProject?.id) { setKeys([]); setLoading(false); return }
    setLoading(true)
    const { data } = await supabase
      .from('client_api_keys')
      .select('id, provider, label, secret_preview, status, last_used_at, created_at')
      .eq('project_id', activeProject.id)
      .order('created_at', { ascending: false })
    setKeys((data ?? []) as ClientApiKey[])
    setLoading(false)
  }, [activeProject?.id])

  useEffect(() => { void load() }, [load])

  async function saveKey() {
    if (!activeProject?.id || !session?.access_token) return
    if (!label.trim() || !secret.trim()) { push({ kind: 'warn', title: 'Add a label and an API key' }); return }
    let cfg: Record<string, unknown> = {}
    if (config.trim()) {
      try {
        const parsed = JSON.parse(config)
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('not an object')
        cfg = parsed as Record<string, unknown>
      } catch { push({ kind: 'danger', title: 'Provider config must be a JSON object' }); return }
    }
    setSaving(true)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/client-secrets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ project_id: activeProject.id, provider, label: label.trim(), secret: secret.trim(), config: cfg }),
      })
      const data = await res.json().catch(() => ({})) as { error?: string; warning?: string; model_count?: number }
      if (!res.ok) throw new Error(data.error ?? `Save failed (HTTP ${res.status})`)
      setSecret(''); setLabel('')
      push({
        kind: data.warning ? 'warn' : 'success',
        title: data.warning ? 'Key saved with a note' : 'API key saved',
        body: data.warning ?? `Validated for ${providerLabel(provider)}.`,
      })
      await load()
    } catch (e) {
      push({ kind: 'danger', title: 'Could not save the key', body: e instanceof Error ? e.message : 'Save failed' })
    } finally { setSaving(false) }
  }

  async function revokeKey(id: string) {
    const { error } = await supabase.from('client_api_keys').update({ status: 'revoked' }).eq('id', id)
    if (error) { push({ kind: 'danger', title: 'Could not revoke the key', body: error.message }); return }
    push({ kind: 'success', title: 'Key revoked' })
    await load()
  }

  async function saveModels() {
    if (!activeProject?.id) return
    setSavingModels(true)
    const ap = (activeProject.ai_policy ?? {}) as Record<string, unknown>
    const next = {
      ...ap,
      default_text_model: textModel.trim() || null,
      default_reasoning_model: reasoningModel.trim() || null,
      default_image_model: imageModel.trim() || 'nano-banana',
    }
    const { error } = await supabase.from('projects').update({ ai_policy: next }).eq('id', activeProject.id)
    setSavingModels(false)
    if (error) { push({ kind: 'danger', title: 'Could not save models', body: error.message }); return }
    push({ kind: 'success', title: 'Models saved', body: 'SONA uses these from the next generation.' })
  }

  if (!activeProject) return null
  const active = keys.filter(k => k.status === 'active')

  const card: React.CSSProperties = { background: color.surface, border: `1px solid ${color.line}`, borderRadius: radius.lg, padding: space[5] }
  const statusColor = (s: string) => s === 'active' ? color.success : s === 'invalid' ? color.danger : color.ghost

  return (
    <div style={{ padding: `${space[8]} ${space[8]} ${space[10]}`, maxWidth: 820 }}>
      <PageHeader
        eyebrow={activeProject.name}
        title="Keys and models"
        subtitle="Connect this space to its own provider keys and pick the models it runs on. Keys are stored encrypted and used only for this space. Text and reasoning run on the space OpenRouter key; image and video run on FAL or OpenRouter. The generation budget lives in Settings → Brain & Models."
      />

      <section style={{ marginBottom: space[8] }}>
        <SectionLabel style={{ marginBottom: space[3] }}>Models</SectionLabel>
        <div style={card}>
          <div style={{ display: 'grid', gap: space[4] }}>
            <Field label="Creative model (text)" helper="OpenRouter slug for writing. Runs on the space OpenRouter key.">
              <Input value={textModel} onChange={e => setTextModel(e.target.value)} placeholder="moonshotai/kimi-k2-0905" />
            </Field>
            <Field label="Reasoning model" helper="OpenRouter slug for planning and evaluation. Runs on the space OpenRouter key.">
              <Input value={reasoningModel} onChange={e => setReasoningModel(e.target.value)} placeholder="z-ai/glm-5.2" />
            </Field>
            <Field label="Image model" helper="Image alias, for example imagen-4, nano-banana-pro, or nano-banana.">
              <Input value={imageModel} onChange={e => setImageModel(e.target.value)} placeholder="imagen-4" />
            </Field>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: space[4] }}>
            <Button variant="primary" onClick={saveModels} disabled={savingModels}>
              {savingModels ? 'Saving' : 'Save models'}
            </Button>
          </div>
          <p style={{ fontSize: t.size.micro, color: color.faint, margin: `${space[3]} 0 0`, lineHeight: 1.5 }}>
            Leave a field blank to use the pipeline default: Kimi for creative, GLM for reasoning, Nano Banana for image.
          </p>
        </div>
      </section>

      <section style={{ marginBottom: space[8] }}>
        <SectionLabel style={{ marginBottom: space[3] }}>Add a key</SectionLabel>
        <div style={card}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: space[4] }}>
            <Field label="Provider">
              <Select value={provider} onChange={e => setProvider(e.target.value)}>
                {PROVIDERS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </Select>
            </Field>
            <Field label="Label">
              <Input value={label} onChange={e => setLabel(e.target.value)} placeholder="e.g. Production key" />
            </Field>
          </div>
          <div style={{ marginTop: space[4] }}>
            <Field label="API key">
              <Input type="password" value={secret} onChange={e => setSecret(e.target.value)} placeholder="Paste the provider API key" autoComplete="off" />
            </Field>
          </div>
          <div style={{ marginTop: space[4] }}>
            <Field label="Provider config (JSON)" optional helper="Only for provider-specific options. Do not put secondary secrets here.">
              <Textarea value={config} onChange={e => setConfig(e.target.value)} rows={2} placeholder='{"endpoint":"..."}' />
            </Field>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: space[4] }}>
            <Button variant="primary" leading={<KeyRound size={14} />} onClick={saveKey} disabled={saving || !label.trim() || !secret.trim()}>
              {saving ? 'Saving' : 'Save key'}
            </Button>
          </div>
          <p style={{ fontSize: t.size.micro, color: color.faint, margin: `${space[3]} 0 0`, lineHeight: 1.5 }}>
            The key is validated with the provider and stored encrypted. Only the space owner can add or revoke keys.
          </p>
        </div>
      </section>

      <section style={{ marginBottom: space[8] }}>
        <SectionLabel style={{ marginBottom: space[3] }} action={`${active.length} active`}>Saved keys</SectionLabel>
        {loading ? (
          <p style={{ fontSize: t.size.cap, color: color.ghost }}>Loading…</p>
        ) : keys.length === 0 ? (
          <div style={{ ...card, textAlign: 'center' }}>
            <p style={{ fontSize: t.size.cap, color: color.ghost, margin: 0 }}>No keys yet. Add one above to run this space on its own provider key.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: space[2] }}>
            {keys.map(k => (
              <div key={k.id} style={{ ...card, padding: space[4], display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: space[3], opacity: k.status === 'revoked' ? 0.55 : 1 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: space[2] }}>
                    <span style={{ fontSize: t.size.sm, fontWeight: t.weight.semibold, color: color.ink }}>{k.label}</span>
                    <span style={{ fontSize: t.size.micro, color: color.ghost }}>{providerLabel(k.provider)}</span>
                  </div>
                  <div style={{ fontSize: t.size.micro, color: color.faint, marginTop: 2 }}>
                    <span style={{ color: statusColor(k.status), textTransform: 'uppercase', letterSpacing: '0.05em' }}>{k.status}</span>
                    {k.secret_preview ? ` · ${k.secret_preview}` : ''}
                    {k.last_used_at ? ` · last used ${new Date(k.last_used_at).toLocaleDateString()}` : ''}
                  </div>
                </div>
                {k.status === 'active' && (
                  <button onClick={() => revokeKey(k.id)} title="Revoke this key"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: radius.md, border: `1px solid ${color.line}`, background: color.surface, color: color.ink2, fontSize: t.size.micro, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                    <Trash2 size={13} /> Revoke
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
