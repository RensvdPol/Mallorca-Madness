import { useEffect, useMemo, useState } from 'react'
import {
  Camera, Check, ChevronRight, Clock3, Crown, Flame, Home, Image, ListChecks,
  LoaderCircle, LockKeyhole, LogOut, Menu, Plus, ShieldCheck, Sparkles, Trophy,
  Upload, Users, X
} from 'lucide-react'
import { supabase } from './supabase'

const NAV_ITEMS = [
  ['home', 'Home', Home],
  ['challenges', 'Opdrachten', ListChecks],
  ['feed', 'Feed', Image],
  ['leaderboard', 'Stand', Trophy],
]

const CATEGORY_EMOJI = {
  Mallorca: '🌴', Feest: '🍻', Sociaal: '🤝', Strafpunten: '🫠', Muziek: '🎤',
  Bonus: '⚡', 'Moment van de dag': '☀️', Overig: '🎯'
}

function formatDate(value) {
  return new Intl.DateTimeFormat('nl-NL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(value))
}

function timeLeft(end) {
  const ms = Math.max(0, new Date(end) - Date.now())
  const d = Math.floor(ms / 86400000)
  const h = Math.floor((ms % 86400000) / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  return `${d}d ${h}u ${m}m`
}

function Login({ onLogin }) {
  const [name, setName] = useState('Rens')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const participants = ['Rens', 'Jorg', 'Sven', 'Gijs', 'Thomas', 'Jens', 'Sil', 'Jury', 'Admin']

  async function submit(e) {
    e.preventDefault(); setBusy(true); setError('')
    const email = `${name.toLowerCase()}@mallorca-madness.local`
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError('Inloggen mislukt. Controleer je naam en wachtwoord.')
    else onLogin(data.session)
    setBusy(false)
  }

  return <main className="login-page">
    <div className="sun-orb" />
    <section className="login-card glass">
      <div className="brand-mark">MM</div>
      <p className="eyebrow">23–30 juli 2026</p>
      <h1>Mallorca<br/><em>Madness</em></h1>
      <p className="muted">De officiële scorekaart van een week zon, chaos en eeuwige roem.</p>
      <form onSubmit={submit} className="login-form">
        <label>Wie ben je?</label>
        <select value={name} onChange={e => setName(e.target.value)}>
          {participants.map(p => <option key={p}>{p}</option>)}
        </select>
        <label>Wachtwoord</label>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••" required />
        {error && <div className="error">{error}</div>}
        <button className="primary-button" disabled={busy}>{busy ? <LoaderCircle className="spin"/> : <LockKeyhole/>} Inloggen</button>
      </form>
    </section>
  </main>
}

function App() {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [page, setPage] = useState('home')
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState({ settings: null, profiles: [], challenges: [], submissions: [], participants: [], leaderboard: [] })
  const [showSubmit, setShowSubmit] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setLoading(false) })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => { if (session) loadAll() }, [session])

  useEffect(() => {
    if (!session) return
    const channel = supabase.channel('mm-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'submissions' }, loadAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'challenges' }, loadAll)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [session])

  async function loadAll() {
    const [settings, profiles, challenges, submissions, sp, leaderboard] = await Promise.all([
      supabase.from('game_settings').select('*').single(),
      supabase.from('profiles').select('*').order('display_name'),
      supabase.from('challenges').select('*').eq('active', true).order('created_at'),
      supabase.from('submissions').select('*, challenges(*), profiles!submissions_submitted_by_fkey(display_name)').order('submitted_at', { ascending: false }),
      supabase.from('submission_participants').select('*'),
      supabase.from('leaderboard').select('*').order('points', { ascending: false }),
    ])
    const mine = profiles.data?.find(p => p.id === session.user.id)
    setProfile(mine)
    setData({ settings: settings.data, profiles: profiles.data || [], challenges: challenges.data || [], submissions: submissions.data || [], participants: sp.data || [], leaderboard: leaderboard.data || [] })
  }

  async function logout() { await supabase.auth.signOut(); setSession(null); setProfile(null) }

  if (loading) return <div className="splash"><LoaderCircle className="spin"/></div>
  if (!session) return <Login onLogin={setSession}/>
  if (!profile) return <div className="splash"><LoaderCircle className="spin"/><p>Profiel laden…</p></div>

  const isStaff = ['jury','admin'].includes(profile.role)
  const approved = data.submissions.filter(s => s.status === 'approved')
  const pending = data.submissions.filter(s => ['pending','needs_evidence'].includes(s.status))
  const top = data.leaderboard[0]

  return <div className="app-shell">
    <header className="topbar">
      <div className="mini-brand"><span>MM</span><div><strong>Mallorca Madness</strong><small>Live score</small></div></div>
      <div className="top-actions"><span className="user-chip">{profile.display_name}</span><button className="icon-button" onClick={logout}><LogOut size={19}/></button></div>
    </header>

    <main className="content">
      {page === 'home' && <HomePage data={data} approved={approved} pending={pending} top={top} profile={profile} onNavigate={setPage} onSubmit={() => setShowSubmit(true)} />}
      {page === 'challenges' && <ChallengesPage challenges={data.challenges} submissions={approved} onSubmit={() => setShowSubmit(true)} />}
      {page === 'feed' && <FeedPage submissions={approved} participants={data.participants} profiles={data.profiles} />}
      {page === 'leaderboard' && <LeaderboardPage leaderboard={data.leaderboard} submissions={approved} participants={data.participants} profiles={data.profiles} />}
      {page === 'jury' && isStaff && <JuryPage submissions={pending} refresh={loadAll}/>} 
      {page === 'admin' && profile.role === 'admin' && <AdminPage refresh={loadAll}/>} 
    </main>

    <nav className="bottom-nav">
      {NAV_ITEMS.map(([id,label,Icon]) => <button key={id} className={page===id?'active':''} onClick={() => setPage(id)}><Icon/><span>{label}</span></button>)}
      {isStaff && <button className={page==='jury'?'active':''} onClick={() => setPage('jury')}><ShieldCheck/><span>Jury</span>{pending.length>0&&<b>{pending.length}</b>}</button>}
    </nav>
    <button className="fab" onClick={() => setShowSubmit(true)}><Plus/> <span>Indienen</span></button>
    {showSubmit && <SubmitModal data={data} profile={profile} onClose={() => setShowSubmit(false)} onDone={() => { setShowSubmit(false); loadAll() }}/>} 
  </div>
}

function HomePage({ data, approved, pending, top, profile, onNavigate, onSubmit }) {
  const special = data.challenges.find(c => c.challenge_type === 'moment')
  const bonus = data.challenges.find(c => c.challenge_type === 'bonus')
  return <>
    <section className="hero-card">
      <div className="hero-copy"><p className="eyebrow">Welkom terug, {profile.display_name}</p><h2>Wie pakt de <em>eeuwige roem?</em></h2>
        <div className="hero-meta"><span><Clock3/> {data.settings ? timeLeft(data.settings.ends_at) : '—'}</span><span><Flame/> {approved.length} voltooid</span></div>
      </div>
      <div className="palm-visual"><span>☀️</span><b>🌴</b></div>
    </section>

    <section className="stat-grid">
      <article className="stat-card"><div className="stat-icon gold"><Crown/></div><small>Koploper</small><strong>{top?.display_name || 'Nog niemand'}</strong><p>{top?.points || 0} punten</p></article>
      <article className="stat-card"><div className="stat-icon coral"><Clock3/></div><small>In beoordeling</small><strong>{pending.length}</strong><p>inzendingen</p></article>
    </section>

    {(special || bonus) && <section><div className="section-head"><div><p className="eyebrow">Vandaag</p><h3>Specials</h3></div><Sparkles/></div>
      <div className="special-grid">
        {special && <ChallengeCard challenge={special} featured onSubmit={onSubmit}/>} 
        {bonus && <ChallengeCard challenge={bonus} onSubmit={onSubmit}/>} 
      </div>
    </section>}

    <section><div className="section-head"><div><p className="eyebrow">Live</p><h3>Top 3</h3></div><button className="text-button" onClick={() => onNavigate('leaderboard')}>Volledige stand <ChevronRight/></button></div>
      <div className="podium-list">{data.leaderboard.slice(0,3).map((p,i)=><div className="podium-row" key={p.id}><span className={`rank rank-${i+1}`}>{i+1}</span><div className="avatar">{p.display_name[0]}</div><div className="grow"><strong>{p.display_name}</strong><small>{p.completed} opdrachten</small></div><b>{p.points} pt</b></div>)}</div>
    </section>

    <section><div className="section-head"><div><p className="eyebrow">Net gebeurd</p><h3>Laatste updates</h3></div><button className="text-button" onClick={() => onNavigate('feed')}>Bekijk feed <ChevronRight/></button></div>
      <div className="mini-feed">{approved.slice(0,3).map(s=><FeedCard key={s.id} submission={s}/>)}</div>
    </section>
  </>
}

function ChallengeCard({ challenge, featured=false, onSubmit }) {
  return <article className={`challenge-card ${featured?'featured':''}`}>
    <div className="challenge-top"><span className="category-pill">{CATEGORY_EMOJI[challenge.category] || '🎯'} {challenge.category}</span><span className={`points ${challenge.points<0?'negative':''}`}>{challenge.points>0?'+':''}{challenge.points}</span></div>
    <h4>{challenge.title}</h4><p>{challenge.description}</p>
    <button onClick={onSubmit}>Bewijs indienen <Upload/></button>
  </article>
}

function ChallengesPage({ challenges, onSubmit }) {
  const [filter, setFilter] = useState('Alle')
  const categories = ['Alle', ...new Set(challenges.map(c=>c.category))]
  const shown = filter==='Alle' ? challenges : challenges.filter(c=>c.category===filter)
  return <><PageIntro eyebrow="Missielijst" title="Alle opdrachten" text="Kies je missie, voer hem uit en lever je bewijs in."/>
    <div className="filter-row">{categories.map(c=><button className={filter===c?'active':''} onClick={()=>setFilter(c)} key={c}>{c}</button>)}</div>
    <div className="challenge-list">{shown.map(c=><ChallengeCard key={c.id} challenge={c} onSubmit={onSubmit}/>)}</div></>
}

function FeedPage({ submissions }) {
  return <><PageIntro eyebrow="Vakantiedagboek" title="Madness feed" text="Alle goedgekeurde momenten, van heldendaden tot totale chaos."/>
    <div className="feed-grid">{submissions.length ? submissions.map(s=><FeedCard key={s.id} submission={s} large/>) : <Empty text="Nog geen goedgekeurde inzendingen."/>}</div></>
}

function FeedCard({ submission, large=false }) {
  const publicUrl = submission.photo_path ? supabase.storage.from('proofs').getPublicUrl(submission.photo_path).data.publicUrl : null
  return <article className={`feed-card ${large?'large':''}`}>
    {publicUrl && <img src={publicUrl} alt="Bewijs" loading="lazy"/>}
    <div className="feed-body"><div className="feed-user"><div className="avatar small">{submission.profiles?.display_name?.[0] || '?'}</div><div><strong>{submission.profiles?.display_name}</strong><small>{formatDate(submission.submitted_at)}</small></div><span className={`points ${submission.challenges?.points<0?'negative':''}`}>{submission.challenges?.points>0?'+':''}{submission.challenges?.points}</span></div>
      <h4>{submission.challenges?.title}</h4>{submission.note&&<p>{submission.note}</p>}</div>
  </article>
}

function LeaderboardPage({ leaderboard }) {
  return <><PageIntro eyebrow="De waarheid" title="Leaderboard" text="Geen excuses. Alleen punten."/>
    <div className="leaderboard-card">{leaderboard.map((p,i)=><div className="leader-row" key={p.id}><span className={`rank rank-${i+1}`}>{i+1}</span><div className="avatar">{p.display_name[0]}</div><div className="grow"><strong>{p.display_name}</strong><small>{p.completed} goedgekeurd</small></div><div className="score"><b>{p.points}</b><small>punten</small></div></div>)}</div>
    <section className="winner-banner"><Trophy/><div><small>Huidige winnaar</small><strong>{leaderboard[0]?.display_name || 'Nog niemand'}</strong></div><Sparkles/></section>
  </>
}

function JuryPage({ submissions, refresh }) {
  async function review(id,status) {
    const reason = status==='rejected' ? prompt('Reden voor afwijzing:') || 'Niet goedgekeurd' : null
    await supabase.from('submissions').update({ status, rejection_reason: reason, reviewed_at: new Date().toISOString() }).eq('id', id)
    refresh()
  }
  return <><PageIntro eyebrow="Controlekamer" title="Jurywachtrij" text="Beoordeel eerlijk, snel en meedogenloos."/>
    <div className="review-list">{submissions.length ? submissions.map(s=><article className="review-card" key={s.id}><FeedCard submission={s} large/><div className="review-actions"><button className="approve" onClick={()=>review(s.id,'approved')}><Check/> Goedkeuren</button><button className="reject" onClick={()=>review(s.id,'rejected')}><X/> Afwijzen</button></div></article>) : <Empty text="Alles is beoordeeld. Lekker gewerkt."/>}</div></>
}

function AdminPage(){ return <Empty text="Adminbeheer kan in de volgende versie worden uitgebreid."/> }

function SubmitModal({ data, profile, onClose, onDone }) {
  const [challengeId,setChallengeId]=useState(data.challenges[0]?.id||'')
  const [note,setNote]=useState('')
  const [file,setFile]=useState(null)
  const [selected,setSelected]=useState([profile.id])
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')
  const participants=data.profiles.filter(p=>p.role==='participant')

  function toggle(id){ setSelected(v=>v.includes(id)?v.filter(x=>x!==id):[...v,id]) }
  async function submit(e){
    e.preventDefault(); setBusy(true); setError('')
    try {
      let photoPath=null
      if(file){ const ext=file.name.split('.').pop(); photoPath=`${profile.id}/${crypto.randomUUID()}.${ext}`; const up=await supabase.storage.from('proofs').upload(photoPath,file,{upsert:false}); if(up.error) throw up.error }
      const {data:submission,error}=await supabase.from('submissions').insert({challenge_id:challengeId,submitted_by:profile.id,note,photo_path:photoPath,status:'pending'}).select().single()
      if(error) throw error
      const rows=(selected.length?selected:[profile.id]).map(id=>({submission_id:submission.id,participant_id:id}))
      const added=await supabase.from('submission_participants').insert(rows); if(added.error) throw added.error
      onDone()
    } catch(err){ setError(err.message||'Er ging iets mis.') }
    setBusy(false)
  }
  return <div className="modal-backdrop" onMouseDown={e=>e.target===e.currentTarget&&onClose()}><section className="modal-card"><button className="modal-close" onClick={onClose}><X/></button><p className="eyebrow">Nieuw bewijs</p><h3>Opdracht indienen</h3>
    <form onSubmit={submit} className="submit-form"><label>Opdracht</label><select value={challengeId} onChange={e=>setChallengeId(e.target.value)}>{data.challenges.map(c=><option value={c.id} key={c.id}>{c.title} ({c.points>0?'+':''}{c.points})</option>)}</select>
      <label>Wie deden mee?</label><div className="person-grid">{participants.map(p=><button type="button" className={selected.includes(p.id)?'selected':''} onClick={()=>toggle(p.id)} key={p.id}>{selected.includes(p.id)&&<Check/>}{p.display_name}</button>)}</div>
      <label>Toelichting</label><textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="Vertel kort wat er gebeurde…"/>
      <label className="upload-zone"><Camera/><strong>{file?file.name:'Foto toevoegen'}</strong><span>JPG, PNG of WebP</span><input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>setFile(e.target.files[0])}/></label>
      {error&&<div className="error">{error}</div>}<button className="primary-button" disabled={busy}>{busy?<LoaderCircle className="spin"/>:<Upload/>} Versturen naar jury</button></form></section></div>
}

function PageIntro({eyebrow,title,text}){return <section className="page-intro"><p className="eyebrow">{eyebrow}</p><h2>{title}</h2><p>{text}</p></section>}
function Empty({text}){return <div className="empty"><Sparkles/><p>{text}</p></div>}

export default App
