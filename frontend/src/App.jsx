import { useState, useEffect } from "react"

function App() {
  const [apiData, setApiData] = useState(null)
  const [teamData, setTeamData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    // Ambil data root API
    const fetchData = async () => {
      try {
        const resRoot = await fetch("http://localhost:8000/")
        if (!resRoot.ok) throw new Error("API Root error")
        const jsonRoot = await resRoot.json()
        setApiData(jsonRoot)

        const resTeam = await fetch("http://localhost:8000/team")
        if (!resTeam.ok) throw new Error("API Team error")
        const jsonTeam = await resTeam.json()
        setTeamData(jsonTeam)
        
        setError(false)
      } catch (err) {
        console.error("Gagal menghubungkan ke backend:", err)
        setError(true)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col justify-between selection:bg-cyan-500 selection:text-slate-900">
      {/* Background Gradients */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-[40%] -left-[20%] w-[80%] h-[80%] rounded-full bg-cyan-500/10 blur-[120px]" />
        <div className="absolute -bottom-[40%] -right-[20%] w-[80%] h-[80%] rounded-full bg-indigo-500/10 blur-[120px]" />
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-12 flex-grow flex flex-col justify-center items-center relative z-10">
        <div className="w-full max-w-4xl bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 md:p-12 shadow-2xl shadow-cyan-950/20">
          
          {/* Header */}
          <div className="text-center space-y-4 mb-12">
            <div className="inline-flex items-center gap-2 bg-cyan-500/10 border border-cyan-500/30 px-4 py-2 rounded-full text-cyan-400 text-sm font-semibold tracking-wide uppercase animate-pulse">
              ☁️ Cloud Computing Project
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-cyan-400 via-teal-400 to-indigo-400 bg-clip-text text-transparent">
              Sistem Pendukung Keputusan SAW
            </h1>
            <p className="text-slate-400 max-w-xl mx-auto text-base md:text-lg">
              Sistem pemilihan laptop berbasis web menggunakan metode Simple Additive Weighting (SAW) Fuzzy.
            </p>
          </div>

          {/* Status Panel */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <div className="w-12 h-12 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin" />
              <p className="text-slate-400 text-sm font-medium">Menghubungkan ke API Backend...</p>
            </div>
          ) : error ? (
            <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-6 text-center space-y-4 my-6">
              <div className="text-rose-400 text-4xl">⚠️</div>
              <h3 className="text-lg font-bold text-rose-200">Gagal Terhubung ke Backend</h3>
              <p className="text-slate-400 text-sm max-w-md mx-auto">
                Pastikan server backend FastAPI Anda sudah berjalan di <code className="bg-slate-950 px-2 py-1 rounded text-cyan-400">http://localhost:8000</code> menggunakan perintah <code className="bg-slate-950 px-2 py-1 rounded text-cyan-400">uvicorn main:app --reload</code>.
              </p>
            </div>
          ) : (
            <div className="space-y-8 animate-fadeIn">
              
              {/* API Status Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Connection Details */}
                <div className="bg-slate-950/50 border border-slate-800/80 rounded-2xl p-6 hover:border-cyan-500/30 transition-all duration-300">
                  <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider mb-4">API Status</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-400">Message:</span>
                      <span className="font-semibold text-slate-200">{apiData?.message}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-400">Status:</span>
                      <span className="flex items-center gap-1.5 font-semibold text-emerald-400">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                        {apiData?.status}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-400">Version:</span>
                      <span className="font-mono text-xs bg-slate-900 px-2 py-1 rounded border border-slate-800 text-slate-300">v{apiData?.version}</span>
                    </div>
                  </div>
                </div>

                {/* Team Panel */}
                <div className="bg-slate-950/50 border border-slate-800/80 rounded-2xl p-6 hover:border-indigo-500/30 transition-all duration-300">
                  <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-4">Project Team</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-400">Group Name:</span>
                      <span className="font-semibold text-slate-200">{teamData?.team}</span>
                    </div>
                    {teamData?.members.map((m, idx) => (
                      <div key={idx} className="flex justify-between items-center text-sm border-t border-slate-900 pt-2 mt-2">
                        <span className="text-slate-200 font-medium">{m.name}</span>
                        <span className="text-slate-500 text-xs">{m.nim} • {m.role}</span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              {/* Next Steps CTA */}
              <div className="text-center pt-6">
                <p className="text-xs text-slate-500">
                  Pondasi Modul 1 Berhasil! Kita siap untuk melangkah ke Modul 2 (Database & Integrasi CRUD).
                </p>
              </div>

            </div>
          )}

        </div>
      </main>

      {/* Footer */}
      <footer className="w-full text-center py-6 border-t border-slate-900 text-xs text-slate-500 relative z-10">
        © {new Date().getFullYear()} Sistem Informasi • Institut Teknologi Kalimantan
      </footer>
    </div>
  )
}

export default App
