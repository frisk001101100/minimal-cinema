import { useMemo, useState } from 'react'
import {
  Aperture, AudioLines, BookOpen, Check, ChevronDown, CircleHelp, Clapperboard,
  Clock3, Film, FolderOpen, Globe2, HelpCircle, Layers3, Menu, Mic2, Plus,
  Search, Settings2, Sparkles, WandSparkles, X, KeyRound, LoaderCircle, ArrowLeft
} from 'lucide-react'

type Provider = 'openai' | 'anthropic' | 'gemini'
type Scene = { number: number; durationSeconds: number; visual: string; narration: string; dialogue: { character: string; line: string }[]; sound: string }
type Story = { title: string; logline: string; synopsis: string; characters: { name: string; description: string; visualIdentity: string }[]; scenes: Scene[]; totalDurationSeconds: number; researchNotes: string[] }

const categories = [
  { name: 'E se…?', description: 'Explore realidades alternativas', icon: Globe2 },
  { name: 'Escolha o final', description: 'Deixe o público decidir', icon: Check },
  { name: 'Mistério', description: 'Revele pistas aos poucos', icon: Search },
  { name: 'Glow Up', description: 'Conte uma transformação', icon: Sparkles },
  { name: 'Documentário', description: 'Histórias com pesquisa e fontes', icon: BookOpen },
  { name: 'Você escolhe', description: 'Crie histórias interativas', icon: Layers3 },
  { name: 'História livre', description: 'Comece com qualquer ideia', icon: WandSparkles },
  { name: 'Personalizado', description: 'Defina seu próprio formato', icon: Plus },
]
const models: Record<Provider, { label: string; options: { value: string; label: string }[] }> = {
  openai: { label: 'OpenAI', options: [{ value: 'gpt-4o-mini', label: 'GPT-4o mini' }, { value: 'gpt-4o', label: 'GPT-4o' }, { value: 'gpt-4.1', label: 'GPT-4.1' }] },
  anthropic: { label: 'Anthropic Claude', options: [{ value: 'claude-haiku-4-5-20251001', label: 'Claude Haiku' }, { value: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4' }] },
  gemini: { label: 'Google Gemini', options: [{ value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' }, { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' }] },
}

function App() {
  const [selected, setSelected] = useState('História livre')
  const [idea, setIdea] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [notice, setNotice] = useState('')
  const [provider, setProvider] = useState<Provider>('openai')
  const [model, setModel] = useState('gpt-4o-mini')
  const [apiKey, setApiKey] = useState('')
  const [duration, setDuration] = useState(90)
  const [format, setFormat] = useState<'short' | 'series' | 'documentary'>('short')
  const [loading, setLoading] = useState(false)
  const [story, setStory] = useState<Story | null>(null)
  const [view, setView] = useState<'create' | 'story'>('create')
  const [activeScene, setActiveScene] = useState(0)
  const [rendering, setRendering] = useState(false)
  const [renderResult, setRenderResult] = useState<{ videoUrl: string; projectZipUrl: string; expiresInSeconds: number } | null>(null)

  const updateScene = (index: number, patch: Partial<Scene>) => {
    setStory(current => current ? { ...current, scenes: current.scenes.map((scene, i) => i === index ? { ...scene, ...patch } : scene) } : current)
  }
  const totalDuration = useMemo(() => story?.scenes.reduce((sum, scene) => sum + (Number(scene.durationSeconds) || 0), 0) ?? 0, [story])

  const startProject = async () => {
    if (!idea.trim()) { setNotice('Escreva uma ideia para começar sua história.'); return }
    if (!apiKey.trim()) { setNotice('Insira sua chave de API para conectar o modelo escolhido.'); return }
    setLoading(true); setNotice('')
    try {
      const response = await fetch('/api/story', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, apiKey, model, category: selected, idea, durationSeconds: duration, format, language: 'Português brasileiro' })
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Não foi possível gerar o roteiro.')
      setStory(payload.story)
      setView('story')
      setActiveScene(0)
      setNotice('')
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Erro ao conectar com a API.')
    } finally { setLoading(false) }
  }

  const generateVideo = async () => {
    if (!story) return
    if (!apiKey.trim()) { setNotice('Insira novamente sua chave de API para renderizar o vídeo.'); return }
    setRendering(true)
    setNotice('Preparando a animação no servidor. Esta etapa pode levar alguns minutos.')
    setRenderResult(null)
    try {
      const sceneBrief = story.scenes.map((scene, index) =>
        'CENA ' + (index + 1) + ' (' + scene.durationSeconds + 's)\\nVISUAL: ' + scene.visual +
        '\\nNARRAÇÃO: ' + scene.narration +
        '\\nDIÁLOGOS: ' + scene.dialogue.map(d => d.character + ': ' + d.line).join(' | ') +
        '\\nSOM: ' + scene.sound
      ).join('\\n\\n')
      const response = await fetch('/api/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider, apiKey, model, category: selected,
          idea: story.title + '\\n' + story.synopsis + '\\n' + sceneBrief,
          durationSeconds: Math.min(90, Math.max(15, totalDuration)),
          language: 'Português brasileiro'
        })
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Não foi possível renderizar o vídeo.')
      setRenderResult(payload)
      setNotice('A prévia animada foi gerada. O protótipo atual ainda não inclui narração em áudio.')
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Erro ao renderizar o vídeo.')
    } finally {
      setRendering(false)
    }
  }

  const backToCreate = () => { setView('create'); setNotice('') }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${menuOpen ? 'sidebar-open' : ''}`}>
        <div className="brand">
          <div className="brand-mark"><Aperture size={19} strokeWidth={1.7} /></div>
          <span>minimal<span className="brand-light">cinema</span></span>
          <button className="mobile-close icon-button" onClick={() => setMenuOpen(false)} aria-label="Fechar menu"><X size={18} /></button>
        </div>
        <button className="new-project" onClick={backToCreate}><Plus size={17} /> Novo projeto <span className="shortcut">⌘ K</span></button>
        <div className="nav-section"><span className="nav-label">WORKSPACE</span>
          <button className="nav-item active" onClick={backToCreate}><Clapperboard size={17} /> Criar história</button>
          <button className="nav-item" onClick={() => setNotice('O histórico de projetos será adicionado em uma próxima etapa.')}><FolderOpen size={17} /> Projetos <span className="nav-count">{story ? 1 : 0}</span></button>
        </div>
        <div className="nav-section"><span className="nav-label">PREFERÊNCIAS</span>
          <button className="nav-item" onClick={() => setNotice('As preferências da conta serão adicionadas em uma próxima etapa.')}><Settings2 size={17} /> Configurações</button>
          <button className="nav-item" onClick={() => setNotice('A central de ajuda estará disponível em breve.')}><CircleHelp size={17} /> Central de ajuda</button>
        </div>
        <div className="sidebar-bottom">
          <div className="plan-card"><div className="plan-top"><Sparkles size={15} /><span>Seu estúdio</span><span className="plan-tag">FREE</span></div><p>Crie sua primeira história e dê vida às suas ideias.</p><button onClick={() => setNotice('O plano Premium será apresentado em uma próxima etapa.')}>Conhecer o Premium <span>↗</span></button></div>
          <div className="profile"><div className="avatar">M</div><div className="profile-copy"><strong>Meu espaço</strong><span>Plano gratuito</span></div><button className="icon-button" aria-label="Opções da conta"><Settings2 size={16} /></button></div>
        </div>
      </aside>
      {menuOpen && <button className="scrim" aria-label="Fechar menu" onClick={() => setMenuOpen(false)} />}
      <main className="main-content">
        <header className="topbar">
          <button className="mobile-menu icon-button" onClick={() => setMenuOpen(true)} aria-label="Abrir menu"><Menu size={20} /></button>
          <div className="breadcrumbs"><span>Workspace</span><span className="crumb-slash">/</span><strong>{view === 'story' ? 'Editar roteiro' : 'Criar história'}</strong></div>
          <div className="topbar-right"><span className="status-dot" /> <span>Interface conectada à API</span><button className="icon-button help-button" aria-label="Ajuda"><HelpCircle size={17} /></button></div>
        </header>

        {view === 'create' ? <div className="content-wrap">
          <section className="welcome"><div className="eyebrow"><span className="eyebrow-line" /> AI STORY STUDIO</div><h1>Uma ideia. <span>Infinitas histórias.</span></h1><p>Transforme o que está na sua cabeça em uma experiência cinematográfica.</p></section>
          <section className="creation-section">
            <div className="section-heading"><div><span className="step-label">PASSO 01</span><h2>Escolha o formato da história</h2></div><span className="optional-label">8 formatos disponíveis</span></div>
            <div className="category-grid">{categories.map(({ name, description, icon: Icon }) => <button key={name} className={`category-card ${selected === name ? 'selected' : ''}`} onClick={() => setSelected(name)}><div className="category-icon"><Icon size={18} strokeWidth={1.7} /></div><div className="category-copy"><strong>{name}</strong><span>{description}</span></div><span className="radio-indicator">{selected === name && <span />}</span></button>)}</div>
          </section>
          <section className="idea-section">
            <div className="section-heading"><div><span className="step-label">PASSO 02</span><h2>Conte sua ideia</h2></div><span className="optional-label">A IA desenvolve o projeto</span></div>
            <div className="idea-panel"><label htmlFor="idea">SOBRE O QUE SERÁ SUA HISTÓRIA?</label><textarea id="idea" maxLength={4000} value={idea} onChange={e => { setIdea(e.target.value); setNotice('') }} placeholder="Ex.: E se a humanidade descobrisse que não está sozinha no universo? Uma mensagem chega à Terra e muda tudo…" rows={4} /><div className="idea-footer"><span><Sparkles size={14} /> A IA desenvolve roteiro, personagens e cenas.</span><span>{idea.length}/4000</span></div></div>
          </section>
          <section className="creation-section">
            <div className="section-heading"><div><span className="step-label">PASSO 03</span><h2>Conecte sua IA</h2></div><span className="optional-label">Sua chave não é salva pelo site</span></div>
            <div className="engine-settings">
              <div className="field-grid">
                <label>PROVEDOR<select value={provider} onChange={e => { const p = e.target.value as Provider; setProvider(p); setModel(models[p].options[0].value) }}><option value="openai">OpenAI</option><option value="anthropic">Anthropic Claude</option><option value="gemini">Google Gemini</option></select></label>
                <label>MODELO<select value={model} onChange={e => setModel(e.target.value)}>{models[provider].options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
              </div>
              <label className="full-field">CHAVE DE API<div className="key-input"><KeyRound size={15} /><input type="password" autoComplete="off" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder={provider === 'openai' ? 'sk-…' : provider === 'anthropic' ? 'sk-ant-…' : 'AIza…'} /></div></label>
              <div className="field-grid">
                <label>DURAÇÃO<select value={duration} onChange={e => setDuration(Number(e.target.value))}><option value={30}>30 segundos</option><option value={60}>1 minuto</option><option value={90}>90 segundos</option><option value={120}>2 minutos</option><option value={180}>3 minutos</option><option value={300}>5 minutos</option></select></label>
                <label>FORMATO<select value={format} onChange={e => setFormat(e.target.value as typeof format)}><option value="short">Vídeo único</option><option value="series">Série / episódios</option><option value="documentary">Documentário</option></select></label>
              </div>
              <p className="privacy-note"><KeyRound size={13} /> A chave é enviada apenas à API para fazer a solicitação ao provedor. Não a compartilhe com ninguém.</p>
            </div>
          </section>
          {notice && <div className="notice" role="alert">{notice}</div>}
          <div className="bottom-actions"><div className="selection-summary"><span className="summary-icon"><Film size={16} /></span><span><small>FORMATO SELECIONADO</small><strong>{selected}</strong></span></div><button className="primary-button" disabled={loading} onClick={startProject}>{loading ? <><LoaderCircle className="spin" size={15} /> Criando roteiro…</> : <>Criar roteiro <span>→</span></>}</button></div>
          <footer className="footer"><span>MINIMAL CINEMA © 2026</span><span>Feito para contar histórias.</span><span className="footer-version">EARLY ACCESS · V0.2</span></footer>
        </div> : <div className="content-wrap story-wrap">
          <section className="welcome"><button className="back-button" onClick={backToCreate}><ArrowLeft size={14} /> Voltar</button><div className="eyebrow"><span className="eyebrow-line" /> ROTEIRO GERADO</div><h1>{story?.title}</h1><p>{story?.logline}</p></section>
          {story && <>
            <section className="story-summary"><span className="step-label">SINOPSE</span><p>{story.synopsis}</p><div className="story-meta"><span><Film size={14} /> {story.scenes.length} cenas</span><span><Clock3 size={14} /> {totalDuration}s</span><span><AudioLines size={14} /> Narração e diálogos</span></div></section>
            <section className="creation-section"><div className="section-heading"><div><span className="step-label">PERSONAGENS</span><h2>Identidade visual</h2></div><span className="optional-label">Referência para manter consistência</span></div><div className="character-grid">{story.characters.map((c, i) => <article className="character-card" key={i}><strong>{c.name}</strong><p>{c.description}</p><small>{c.visualIdentity}</small></article>)}</div></section>
            <section className="creation-section">
              <div className="section-heading">
                <div><span className="step-label">ROTEIRO</span><h2>Edite suas cenas</h2></div>
                <span className="optional-label">Alterações ficam nesta sessão</span>
              </div>
              <div className="scene-editor">
                <div className="scene-list">
                  {story.scenes.map((scene, i) => (
                    <button key={i} className={activeScene === i ? 'scene-tab active' : 'scene-tab'} onClick={() => setActiveScene(i)}>
                      <span>{String(i + 1).padStart(2, '0')}</span><span>Cena {i + 1}</span><small>{scene.durationSeconds}s</small>
                    </button>
                  ))}
                </div>
                {story.scenes[activeScene] ? (
                  <div className="scene-fields">
                    <div className="scene-field-heading">
                      <strong>Cena {activeScene + 1}</strong>
                      <label>DURAÇÃO (SEGUNDOS)
                        <input type="number" min={1} max={180} value={story.scenes[activeScene].durationSeconds} onChange={e => updateScene(activeScene, { durationSeconds: Number(e.target.value) })} />
                      </label>
                    </div>
                    <label>VISUAL / AÇÃO
                      <textarea rows={4} value={story.scenes[activeScene].visual} onChange={e => updateScene(activeScene, { visual: e.target.value })} />
                    </label>
                    <label>NARRAÇÃO
                      <textarea rows={3} value={story.scenes[activeScene].narration} onChange={e => updateScene(activeScene, { narration: e.target.value })} />
                    </label>
                    <label>SONS E AMBIENTE
                      <textarea rows={2} value={story.scenes[activeScene].sound} onChange={e => updateScene(activeScene, { sound: e.target.value })} />
                    </label>
                    <div className="dialogue-editor">
                      <strong>DIÁLOGOS</strong>
                      {story.scenes[activeScene].dialogue.map((dialogueItem, i) => (
                        <div className="dialogue-row" key={i}>
                          <input value={dialogueItem.character} aria-label="Personagem" onChange={e => {
                            const dialogue = [...story.scenes[activeScene].dialogue];
                            dialogue[i] = { ...dialogueItem, character: e.target.value };
                            updateScene(activeScene, { dialogue });
                          }} />
                          <input value={dialogueItem.line} aria-label="Fala" onChange={e => {
                            const dialogue = [...story.scenes[activeScene].dialogue];
                            dialogue[i] = { ...dialogueItem, line: e.target.value };
                            updateScene(activeScene, { dialogue });
                          }} />
                        </div>
                      ))}
                    </div>
                    <div className="scene-nav">
                      <button disabled={activeScene === 0} onClick={() => setActiveScene(v => v - 1)}>Cena anterior</button>
                      <button disabled={activeScene === story.scenes.length - 1} onClick={() => setActiveScene(v => v + 1)}>Próxima cena →</button>
                    </div>
                  </div>
                ) : null}
              </div>
            </section>
            {story.researchNotes.length > 0 && <section className="research-notes"><strong>VERIFICAÇÃO NECESSÁRIA</strong>{story.researchNotes.map((note, i) => <p key={i}>{note}</p>)}</section>}
            <div className="notice">Roteiro pronto e editável. A renderização experimental cria uma animação visual no servidor; narração em áudio e edição individual das cenas ainda serão integradas.</div>
            {renderResult && <section className="render-result"><strong>ARQUIVOS PRONTOS</strong><div><a href={renderResult.videoUrl} target="_blank" rel="noreferrer">Baixar vídeo MP4 ↗</a><a href={renderResult.projectZipUrl} target="_blank" rel="noreferrer">Baixar projeto ZIP ↗</a></div><small>Links temporários: expiram em 24 horas.</small></section>}
            <div className="bottom-actions"><div className="selection-summary"><span className="summary-icon"><Check size={16} /></span><span><small>ROTEIRO SALVO NESTA SESSÃO</small><strong>{story.scenes.length} cenas · {totalDuration} segundos</strong></span></div><div className="action-buttons"><button className="secondary-button" onClick={() => { const blob = new Blob([JSON.stringify(story, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'roteiro-minimal-cinema.json'; a.click(); URL.revokeObjectURL(url) }}>Exportar roteiro</button><button className="primary-button" disabled={rendering} onClick={generateVideo}>{rendering ? <><LoaderCircle className="spin" size={15} /> Renderizando…</> : <>Gerar prévia animada <span>→</span></>}</button></div></div>
          </>}
          <footer className="footer"><span>MINIMAL CINEMA © 2026</span><span>Feito para contar histórias.</span><span className="footer-version">ENGINE · V0.2</span></footer>
        </div>}
      </main>
    </div>
  )
}
export default App
