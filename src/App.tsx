import { useState } from 'react'
import {
  Aperture, AudioLines, BookOpen, Check, ChevronDown, CircleHelp, Clapperboard,
  Clock3, Film, FolderOpen, Globe2, HelpCircle, Layers3, Menu, Mic2, Plus,
  Search, Settings2, Sparkles, WandSparkles, X
} from 'lucide-react'

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

function App() {
  const [selected, setSelected] = useState('História livre')
  const [idea, setIdea] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [notice, setNotice] = useState('')

  const startProject = () => {
    if (!idea.trim()) {
      setNotice('Escreva uma ideia para começar sua história.')
      return
    }
    setNotice('Sua ideia está pronta para a próxima etapa. A integração de IA será conectada em breve.')
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${menuOpen ? 'sidebar-open' : ''}`}>
        <div className="brand">
          <div className="brand-mark"><Aperture size={19} strokeWidth={1.7} /></div>
          <span>minimal<span className="brand-light">cinema</span></span>
          <button className="mobile-close icon-button" onClick={() => setMenuOpen(false)} aria-label="Fechar menu"><X size={18} /></button>
        </div>

        <button className="new-project" onClick={() => document.getElementById('idea')?.focus()}>
          <Plus size={17} /> Novo projeto
          <span className="shortcut">⌘ K</span>
        </button>

        <div className="nav-section">
          <span className="nav-label">WORKSPACE</span>
          <button className="nav-item active"><Clapperboard size={17} /> Criar história</button>
          <button className="nav-item" onClick={() => setNotice('Seus projetos aparecerão aqui conforme forem criados.')}><FolderOpen size={17} /> Projetos <span className="nav-count">0</span></button>
        </div>

        <div className="nav-section">
          <span className="nav-label">PREFERÊNCIAS</span>
          <button className="nav-item" onClick={() => setNotice('Configurações estarão disponíveis em breve.')}><Settings2 size={17} /> Configurações</button>
          <button className="nav-item" onClick={() => setNotice('A central de ajuda estará disponível em breve.')}><CircleHelp size={17} /> Central de ajuda</button>
        </div>

        <div className="sidebar-bottom">
          <div className="plan-card">
            <div className="plan-top"><Sparkles size={15} /><span>Seu estúdio</span><span className="plan-tag">FREE</span></div>
            <p>Crie sua primeira história e dê vida às suas ideias.</p>
            <button onClick={() => setNotice('O plano Premium será apresentado em breve.')}>Conhecer o Premium <span>↗</span></button>
          </div>
          <div className="profile">
            <div className="avatar">M</div>
            <div className="profile-copy"><strong>Meu espaço</strong><span>Plano gratuito</span></div>
            <button className="icon-button" aria-label="Opções da conta"><Settings2 size={16} /></button>
          </div>
        </div>
      </aside>

      {menuOpen && <button className="scrim" aria-label="Fechar menu" onClick={() => setMenuOpen(false)} />}

      <main className="main-content">
        <header className="topbar">
          <button className="mobile-menu icon-button" onClick={() => setMenuOpen(true)} aria-label="Abrir menu"><Menu size={20} /></button>
          <div className="breadcrumbs"><span>Workspace</span><span className="crumb-slash">/</span><strong>Criar história</strong></div>
          <div className="topbar-right"><span className="status-dot" /> <span>Todos os sistemas operacionais</span><button className="icon-button help-button" aria-label="Ajuda"><HelpCircle size={17} /></button></div>
        </header>

        <div className="content-wrap">
          <section className="welcome">
            <div className="eyebrow"><span className="eyebrow-line" /> AI STORY STUDIO</div>
            <h1>Uma ideia. <span>Infinitas histórias.</span></h1>
            <p>Transforme o que está na sua cabeça em uma experiência cinematográfica.</p>
          </section>

          <section className="creation-section">
            <div className="section-heading">
              <div><span className="step-label">PASSO 01</span><h2>Escolha o formato da história</h2></div>
              <span className="optional-label">8 formatos disponíveis</span>
            </div>
            <div className="category-grid">
              {categories.map(({ name, description, icon: Icon }) => (
                <button key={name} className={`category-card ${selected === name ? 'selected' : ''}`} onClick={() => setSelected(name)}>
                  <div className="category-icon"><Icon size={18} strokeWidth={1.7} /></div>
                  <div className="category-copy"><strong>{name}</strong><span>{description}</span></div>
                  <span className="radio-indicator">{selected === name && <span />}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="idea-section">
            <div className="section-heading">
              <div><span className="step-label">PASSO 02</span><h2>Conte sua ideia</h2></div>
              <span className="optional-label">Você pode editar depois</span>
            </div>
            <div className="idea-panel">
              <label htmlFor="idea">SOBRE O QUE será sua história?</label>
              <textarea id="idea" value={idea} onChange={e => { setIdea(e.target.value); setNotice('') }} placeholder="Ex.: E se a humanidade descobrisse que não está sozinha no universo? Uma mensagem chega à Terra e muda tudo…" rows={4} />
              <div className="idea-footer"><span><Sparkles size={14} /> A IA pode desenvolver sua ideia a partir de poucas palavras.</span><span>{idea.length}/1000</span></div>
            </div>
          </section>

          {notice && <div className="notice" role="status">{notice}</div>}

          <div className="bottom-actions">
            <div className="selection-summary"><span className="summary-icon"><Film size={16} /></span><span><small>FORMATO SELECIONADO</small><strong>{selected}</strong></span></div>
            <button className="primary-button" onClick={startProject}>Continuar <span>→</span></button>
          </div>

          <footer className="footer"><span>MINIMAL CINEMA © 2026</span><span>Feito para contar histórias.</span><span className="footer-version">EARLY ACCESS · V0.1</span></footer>
        </div>
      </main>
    </div>
  )
}

export default App