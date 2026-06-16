import { useState, useEffect, useCallback } from "react"
import AuthScreen from "./components/AuthScreen"
import Toast from "./components/Toast"
import LaptopFormModal from "./components/LaptopFormModal"

function App() {
  // Authentication & Layout States
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem("currentUser")
      return savedUser ? JSON.parse(savedUser) : null
    } catch {
      return null
    }
  })
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false)
  const [activeTab, setActiveTab] = useState("ranking") // ranking, criteria, crud, saw-steps
  
  // Filtering & Sorting
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState("vi_desc") // vi_desc, price_asc, price_desc, ram_desc, tkdn_desc
  
  // Toast Notification State
  const [toast, setToast] = useState({ show: false, message: "", type: "success" })

  // Data States
  const [stats, setStats] = useState(null)
  const [sawData, setSawData] = useState(null)
  const [alternatives, setAlternatives] = useState([])
  const [criteria, setCriteria] = useState([])
  const [loading, setLoading] = useState(true)
  const [isConnected, setIsConnected] = useState(false)

  // CRUD Laptop State
  const [isCrudModalOpen, setIsCrudModalOpen] = useState(false)
  const [crudMode, setCrudMode] = useState("create") // create or edit
  const [editingId, setEditingId] = useState(null)
  const [selectedLaptop, setSelectedLaptop] = useState(null)
  const [crudError, setCrudError] = useState("")
  const [sawPage, setSawPage] = useState(1)
  // Justification Popup State
  const [justificationModal, setJustificationModal] = useState({ open: false, laptop: null })

  // Temporary weight state for editing in Atur Bobot
  const [tempWeights, setTempWeights] = useState({})

  // Sync tempWeights with database values when criteria are loaded/updated
  useEffect(() => {
    if (criteria && criteria.length > 0) {
      const initial = {}
      criteria.forEach(c => {
        initial[c.kode] = c.weight
      })
      setTempWeights(initial)
    }
  }, [criteria])

  // API Base URL from environment variable
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000"

  // Show toast notification
  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type })
  }

  // Health check polling
  const checkHealth = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/health`)
      const data = await res.json()
      setIsConnected(data.status === "healthy")
    } catch {
      setIsConnected(false)
    }
  }, [API_URL])

  // Fetch all system data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      
      // Fetch Stats
      const resStats = await fetch(`${API_URL}/saw/stats`)
      if (!resStats.ok) throw new Error("Gagal mengambil data statistik")
      const jsonStats = await resStats.json()
      setStats(jsonStats)

      // Fetch SAW Results
      const resSaw = await fetch(`${API_URL}/saw/calculate`)
      if (!resSaw.ok) throw new Error("Gagal mengambil perhitungan SAW")
      const jsonSaw = await resSaw.json()
      setSawData(jsonSaw)

      // Fetch Raw Alternatives for CRUD
      const resAlts = await fetch(`${API_URL}/alternatives`)
      if (!resAlts.ok) throw new Error("Gagal mengambil data alternatif")
      const jsonAlts = await resAlts.json()
      setAlternatives(jsonAlts)

      // Fetch Criteria
      const resCrit = await fetch(`${API_URL}/criteria`)
      if (!resCrit.ok) throw new Error("Gagal mengambil data kriteria")
      const jsonCrit = await resCrit.json()
      setCriteria(jsonCrit)

    } catch (err) {
      console.error("Fetch error:", err)
    } finally {
      setLoading(false)
    }
  }, [API_URL])

  // Initial load and polling setup
  useEffect(() => {
    checkHealth()
    fetchData()

    // Poll health check every 5 seconds
    const interval = setInterval(checkHealth, 5000)
    return () => clearInterval(interval)
  }, [checkHealth, fetchData])

  // Format IDR Currency
  const formatRupiah = (number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0
    }).format(number)
  }

  // Handle Login Success
  const handleLoginSuccess = (user) => {
    setCurrentUser(user)
    localStorage.setItem("currentUser", JSON.stringify(user))
  }

  // Handle Logout
  const handleLogout = () => {
    setCurrentUser(null)
    localStorage.removeItem("currentUser")
    showToast("Anda telah keluar dari aplikasi", "success")
  }

  // Handle local change for weights (in-memory only before save)
  const handleTempWeightChange = (kode, newWeight) => {
    setTempWeights(prev => ({
      ...prev,
      [kode]: parseFloat(newWeight)
    }))
  }

  // Handle Auto-Normalize Weights to sum exactly 1.0 (100%)
  const handleAutoNormalizeWeights = () => {
    const current = Object.keys(tempWeights).length > 0
      ? tempWeights
      : criteria.reduce((acc, c) => ({ ...acc, [c.kode]: c.weight }), {})

    const sum = Object.values(current).reduce((a, b) => a + b, 0)
    if (sum === 0) return
    
    const newWeights = {}
    let roundedSum = 0
    
    Object.keys(current).forEach(kode => {
      const val = current[kode]
      const scaled = Math.round((val / sum) * 20) / 20 // round to nearest 0.05
      newWeights[kode] = scaled
      roundedSum += scaled
    })
    
    // Adjust difference to enforce exactly 1.0 (100%)
    let diff = 1.0 - roundedSum
    diff = Math.round(diff * 20) / 20
    if (diff !== 0) {
      const keys = Object.keys(current)
      newWeights[keys[0]] = Math.max(0, Math.min(1, newWeights[keys[0]] + diff))
    }
    
    setTempWeights(newWeights)
    showToast("Bobot berhasil dinormalisasi otomatis ke 100%", "info")
  }

  // Save all updated weights to backend database sequentially
  const saveWeights = async () => {
    try {
      setLoading(true)
      const promises = Object.entries(tempWeights).map(([kode, weight]) => {
        return fetch(`${API_URL}/criteria/${kode}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ weight })
        })
      })
      
      await Promise.all(promises)
      await fetchData()
      showToast("Semua bobot kriteria berhasil diperbarui di database!", "success")
    } catch (err) {
      showToast("Gagal menyimpan bobot kriteria", "error")
    } finally {
      setLoading(false)
    }
  }

  // Handle CRUD Laptop Submit
  const handleLaptopSubmit = async (formData) => {
    setCrudError("")
    
    // Validasi kode laptop (harus unik jika create)
    if (crudMode === "create") {
      const codeExists = alternatives.some(a => a.kode.toLowerCase() === formData.kode.toLowerCase())
      if (codeExists) {
        setCrudError(`Kode laptop ${formData.kode} sudah terpakai`)
        return
      }
    }

    try {
      const method = crudMode === "create" ? "POST" : "PUT"
      const url = crudMode === "create" 
        ? `${API_URL}/alternatives` 
        : `${API_URL}/alternatives/${editingId}`

      const res = await fetch(url, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      })

      if (res.ok) {
        setIsCrudModalOpen(false)
        await fetchData()
        showToast(
          crudMode === "create" ? "Laptop baru berhasil ditambahkan!" : "Data laptop berhasil diperbarui!",
          "success"
        )
      } else {
        const errJson = await res.json()
        setCrudError(errJson.detail || "Terjadi kesalahan")
      }
    } catch (err) {
      setCrudError("Gagal terhubung ke API")
    }
  }

  // Handle Delete Alternative
  const handleLaptopDelete = async (id, name) => {
    if (!window.confirm(`Apakah Anda yakin ingin menghapus "${name}"?`)) return
    try {
      const res = await fetch(`${API_URL}/alternatives/${id}`, {
        method: "DELETE"
      })
      if (res.ok) {
        await fetchData()
        showToast(`Laptop "${name}" telah dihapus`, "success")
      } else {
        showToast("Gagal menghapus laptop", "error")
      }
    } catch (err) {
      showToast("Error koneksi server", "error")
    }
  }

  // Open Create Form Modal
  const openCreateModal = () => {
    setSelectedLaptop({
      kode: `A${String(alternatives.length + 1).padStart(2, "0")}`,
      name: "",
      brand: "",
      c1_tkdn: 40.0,
      c2_ram: 8.0,
      c3_ssd: 256.0,
      c4_warranty: 1.0,
      c5_price: 10000000.0
    })
    setCrudMode("create")
    setCrudError("")
    setIsCrudModalOpen(true)
  }

  // Open Edit Form Modal
  const openEditModal = (alt) => {
    setSelectedLaptop(alt)
    setEditingId(alt.id)
    setCrudMode("edit")
    setCrudError("")
    setIsCrudModalOpen(true)
  }

  // Filter and Sort rankings dynamically
  const filteredAndSortedRankings = sawData?.preferences
    ? [...sawData.preferences]
        .filter(item => 
          item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.kode.toLowerCase().includes(searchQuery.toLowerCase())
        )
        .sort((a, b) => {
          if (sortBy === "vi_desc") return b.v_i - a.v_i
          
          const altA = alternatives.find(alt => alt.kode === a.kode)
          const altB = alternatives.find(alt => alt.kode === b.kode)
          
          if (!altA || !altB) return 0
          
          if (sortBy === "price_asc") return altA.c5_price - altB.c5_price
          if (sortBy === "price_desc") return altB.c5_price - altA.c5_price
          if (sortBy === "ram_desc") return altB.c2_ram - altA.c2_ram
          if (sortBy === "tkdn_desc") return altB.c1_tkdn - altA.c1_tkdn
          return 0
        })
    : []

  // Pagination for Matriks SAW steps (Langkah 1 & 2)
  const itemsPerPage = 15
  const totalSawPages = sawData ? Math.ceil(sawData.fuzzy_matrix.length / itemsPerPage) : 1
  const currentSawPage = Math.min(sawPage, totalSawPages) || 1
  const paginatedFuzzyMatrix = sawData
    ? sawData.fuzzy_matrix.slice((currentSawPage - 1) * itemsPerPage, currentSawPage * itemsPerPage)
    : []
  const paginatedNormalizedMatrix = sawData
    ? sawData.normalized_matrix.slice((currentSawPage - 1) * itemsPerPage, currentSawPage * itemsPerPage)
    : []

  // Total contribution percentage calculation for localWeights
  const tempTotalPercentage = criteria.length > 0
    ? Math.round(Object.keys(tempWeights).length > 0
        ? Object.values(tempWeights).reduce((sum, w) => sum + w, 0) * 100
        : criteria.reduce((sum, c) => sum + c.weight, 0) * 100)
    : 0

  // RENDER LOGIN SCREEN IF NOT AUTHENTICATED
  if (!currentUser) {
    return (
      <>
        {toast.show && (
          <Toast 
            message={toast.message} 
            type={toast.type} 
            onClose={() => setToast({ ...toast, show: false })} 
          />
        )}
        <AuthScreen 
          onLoginSuccess={handleLoginSuccess}
          showToast={showToast}
          API_URL={API_URL}
        />
      </>
    )
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-brand-bg font-sans">
      
      {/* Toast Notification Container */}
      {toast.show && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={() => setToast({ ...toast, show: false })} 
        />
      )}

      {/* 1. LEFT SIDEBAR NAVBAR */}
      <aside 
        onMouseEnter={() => setIsSidebarExpanded(true)}
        onMouseLeave={() => setIsSidebarExpanded(false)}
        className={`bg-white border-r border-brand-border h-full flex flex-col justify-between transition-all duration-300 ease-in-out z-20 ${
          isSidebarExpanded ? "w-64" : "w-20"
        }`}
      >
        
        {/* Top: Logo & Navigation */}
        <div>
          <div className="px-4 py-5 flex items-center border-b border-brand-border min-h-[81px]">
            <div className="flex items-center pl-[14px] gap-2 overflow-hidden w-full">
              <div className="w-2.5 h-6 bg-brand-primary rounded-sm flex-shrink-0" />
              <div className={`transition-all duration-300 ease-in-out overflow-hidden ${
                isSidebarExpanded ? "opacity-100 max-w-[180px] ml-1" : "opacity-0 max-w-0 ml-0"
              }`}>
                <h1 className="text-xs font-black text-slate-900 tracking-wider whitespace-nowrap">SPK SAW LAPTOP</h1>
                <p className="text-[9px] text-slate-400 font-bold tracking-widest uppercase whitespace-nowrap">KEMENDAG RI</p>
              </div>
            </div>
          </div>

          {/* Menu Navigation */}
          <nav className="p-4 space-y-1.5">
            <button 
              onClick={() => setActiveTab("ranking")}
              className={`w-full flex items-center pl-[14px] py-3 rounded-[12px] font-bold text-xs transition-all ${
                activeTab === "ranking" 
                  ? "bg-brand-primary text-white shadow-sm" 
                  : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
              }`}
              title="Rangking Keputusan"
            >
              <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span className={`transition-all duration-300 ease-in-out overflow-hidden whitespace-nowrap ${
                isSidebarExpanded ? "opacity-100 max-w-[160px] ml-3" : "opacity-0 max-w-0 ml-0"
              }`}>
                Rangking Keputusan
              </span>
            </button>

            <button 
              onClick={() => setActiveTab("criteria")}
              className={`w-full flex items-center pl-[14px] py-3 rounded-[12px] font-bold text-xs transition-all ${
                activeTab === "criteria" 
                  ? "bg-brand-primary text-white shadow-sm" 
                  : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
              }`}
              title="Atur Bobot"
            >
              <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
              <span className={`transition-all duration-300 ease-in-out overflow-hidden whitespace-nowrap ${
                isSidebarExpanded ? "opacity-100 max-w-[160px] ml-3" : "opacity-0 max-w-0 ml-0"
              }`}>
                Atur Bobot
              </span>
            </button>

            <button 
              onClick={() => setActiveTab("crud")}
              className={`w-full flex items-center pl-[14px] py-3 rounded-[12px] font-bold text-xs transition-all ${
                activeTab === "crud" 
                  ? "bg-brand-primary text-white shadow-sm" 
                  : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
              }`}
              title="Kelola Laptop"
            >
              <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span className={`transition-all duration-300 ease-in-out overflow-hidden whitespace-nowrap ${
                isSidebarExpanded ? "opacity-100 max-w-[160px] ml-3" : "opacity-0 max-w-0 ml-0"
              }`}>
                Kelola Laptop
              </span>
            </button>

            <button 
              onClick={() => setActiveTab("saw-steps")}
              className={`w-full flex items-center pl-[14px] py-3 rounded-[12px] font-bold text-xs transition-all ${
                activeTab === "saw-steps" 
                  ? "bg-brand-primary text-white shadow-sm" 
                  : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
              }`}
              title="Matriks SAW"
            >
              <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
              <span className={`transition-all duration-300 ease-in-out overflow-hidden whitespace-nowrap ${
                isSidebarExpanded ? "opacity-100 max-w-[160px] ml-3" : "opacity-0 max-w-0 ml-0"
              }`}>
                Matriks SAW
              </span>
            </button>
          </nav>
        </div>

        {/* Bottom: Profile & Logout */}
        <div className="p-4 border-t border-brand-border">
          <div className="flex flex-col gap-2">
            
            {/* Operator Info Card */}
            <div className={`bg-slate-50 border border-brand-border rounded-[12px] transition-all duration-300 ease-in-out overflow-hidden ${
              isSidebarExpanded ? "p-3 opacity-100 max-h-[80px]" : "p-0 opacity-0 max-h-0 border-none"
            }`}>
              <div className="flex items-center gap-2 whitespace-nowrap">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider truncate">
                  Operator: {currentUser.username}
                </span>
              </div>
              {isSidebarExpanded && (
                <div className="text-[9px] text-slate-400 font-semibold mt-1">
                  Koneksi API: {isConnected ? "Aktif" : "Terputus"}
                </div>
              )}
            </div>

            {/* Logout Button */}
            <button 
              onClick={handleLogout}
              className={`w-full flex items-center pl-[14px] py-3 rounded-[12px] font-bold text-xs transition-all duration-300 ease-in-out text-rose-500 hover:bg-rose-50`}
              title="Keluar"
            >
              <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span className={`transition-all duration-300 ease-in-out overflow-hidden whitespace-nowrap ${
                isSidebarExpanded ? "opacity-100 max-w-[100px] ml-3" : "opacity-0 max-w-0 ml-0"
              }`}>
                Keluar
              </span>
            </button>

          </div>
        </div>

      </aside>

      {/* 2. MAIN SCROLLABLE DASHBOARD CONTENT AREA */}
      <main className="flex-1 h-full overflow-y-auto p-6 md:p-8">
        
        {/* Loading state if fetching API */}
        {loading && !sawData ? (
          <div className="flex flex-col items-center justify-center h-full space-y-4">
            <div className="w-12 h-12 border-4 border-brand-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-slate-500 text-xs font-semibold">Memuat data keputusan...</p>
          </div>
        ) : (
          <div className="space-y-8 animate-fade-in-up animate-gpu">
            
            {/* Top stats section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h2 className="text-2xl font-black text-slate-900 leading-tight">Dashboard Analisis SPK</h2>
                <p className="text-xs text-slate-500 mt-1 font-medium">Pengolahan kelayakan laptop E-Katalog menggunakan metode SAW Fuzzy.</p>
              </div>
              <div className={`px-3 py-1 rounded-full text-[10px] font-bold ${isConnected ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-rose-50 text-rose-700 border border-rose-100"}`}>
                {isConnected ? "Sistem Aktif" : "Sistem Terputus"}
              </div>
            </div>

            {/* Stats Grid (Style ProCleaning: Soft border, rounded-2xl, big values) */}
            {stats && (
              <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white border border-brand-border rounded-[20px] p-6 shadow-sm">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Laptop</p>
                  <h4 className="text-3xl font-black text-slate-900 mt-1">{stats.total_laptops}</h4>
                  <p className="text-[9px] text-slate-500 mt-1 font-medium">Alternatif terdaftar</p>
                </div>

                <div className="bg-white border border-brand-border rounded-[20px] p-6 shadow-sm">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sangat Layak</p>
                  <h4 className="text-3xl font-black text-slate-900 mt-1">{stats.recommended_count}</h4>
                  <p className="text-[9px] text-emerald-600 mt-1 font-bold">15% Alternatif Terbaik</p>
                </div>

                <div className="bg-white border border-brand-border rounded-[20px] p-6 shadow-sm">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Rata-Rata Harga</p>
                  <h4 className="text-lg font-black text-slate-900 mt-2">{formatRupiah(stats.average_price)}</h4>
                  <p className="text-[9px] text-slate-500 mt-1 font-medium">Efisiensi anggaran</p>
                </div>

                <div className="bg-white border border-brand-border rounded-[20px] p-6 shadow-sm">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Rentang Harga</p>
                  <h4 className="text-xs font-bold text-emerald-600 mt-2">Min: {formatRupiah(stats.min_price?.price)}</h4>
                  <h4 className="text-xs font-bold text-rose-600 mt-0.5">Max: {formatRupiah(stats.max_price?.price)}</h4>
                </div>
              </section>
            )}

            {/* TAB CONTENTS CONTAINER (Style ProCleaning: Large rounded corners rounded-[20px]) */}
            <div className="bg-white border border-brand-border rounded-[20px] p-6 md:p-8 shadow-sm min-h-[400px]">
              
              {/* TAB 1: RANKING TABLE */}
              {activeTab === "ranking" && (
                <div className="space-y-6">
                  
                  {/* Search, Filter, Sort (Style ProCleaning: clean slate light backgrounds) */}
                  <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-slate-50 border border-brand-border p-5 rounded-[16px]">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Peringkat Alternatif Laptop</h3>
                      <p className="text-[11px] text-slate-500 mt-0.5 font-medium">Urutan kelayakan pengadaan laptop berdasarkan kriteria terbobot.</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                      {/* Sort Dropdown */}
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Urutkan:</span>
                        <select 
                          value={sortBy}
                          onChange={(e) => setSortBy(e.target.value)}
                          className="border border-slate-200 bg-white px-2 py-1.5 rounded-lg text-xs focus:outline-none focus:border-brand-primary font-bold text-slate-800"
                        >
                          <option value="vi_desc">Nilai Kelayakan (V_i) Tertinggi</option>
                          <option value="price_asc">Harga Terendah</option>
                          <option value="price_desc">Harga Tertinggi</option>
                          <option value="ram_desc">RAM Terbesar</option>
                          <option value="tkdn_desc">TKDN Tertinggi</option>
                        </select>
                      </div>

                      {/* Search Input */}
                      <input 
                        type="text" 
                        placeholder="Cari model laptop/merek..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="border border-slate-200 px-3 py-1.5 rounded-lg text-xs focus:outline-none focus:border-brand-primary bg-white w-full sm:w-56 font-semibold"
                      />
                    </div>
                  </div>

                  {/* Table (Style ProCleaning: Clean borders and white/slate rows) */}
                  <div className="overflow-x-auto border border-brand-border rounded-[16px]">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-brand-border text-slate-700 font-bold">
                          <th className="p-3.5 text-center w-16">PERINGKAT</th>
                          <th className="p-3.5 w-16 text-center">KODE</th>
                          <th className="p-3.5">NAMA PRODUK / MODEL</th>
                          <th className="p-3.5 w-28">MEREK</th>
                          <th className="p-3.5 text-center">SKOR (V_i)</th>
                          <th className="p-3.5 w-36 text-center">STATUS KELAYAKAN</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-brand-border">
                        {filteredAndSortedRankings.length > 0 ? (
                          filteredAndSortedRankings.map((item) => (
                            <tr key={item.kode} className="hover:bg-slate-50/50 transition-colors">
                              <td className="p-3.5 text-center font-bold text-slate-900">
                                {item.rank}
                              </td>
                              <td className="p-3.5 text-center font-mono text-slate-400 font-semibold">{item.kode}</td>
                              <td className="p-3.5 font-semibold text-slate-900">{item.name}</td>
                              <td className="p-3.5 text-slate-500 font-semibold">{item.brand}</td>
                              <td className="p-3.5 text-center font-bold text-brand-primary">{item.v_i.toFixed(4)}</td>
                              <td className="p-3.5 text-center">
                                {item.keterangan === "SANGAT LAYAK" && (
                                  <button 
                                    onClick={() => setJustificationModal({ open: true, laptop: item })}
                                    className="bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 text-emerald-700 font-bold px-2.5 py-1 rounded-full text-[10px] uppercase tracking-wider transition-colors flex items-center gap-1 mx-auto shadow-sm"
                                  >
                                    <span>Sangat Layak</span>
                                    <svg className="w-2.5 h-2.5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                  </button>
                                )}
                                {item.keterangan === "CUKUP LAYAK" && (
                                  <button 
                                    onClick={() => setJustificationModal({ open: true, laptop: item })}
                                    className="bg-amber-50 hover:bg-amber-100 border border-amber-100 text-amber-700 font-bold px-2.5 py-1 rounded-full text-[10px] uppercase tracking-wider transition-colors flex items-center gap-1 mx-auto shadow-sm"
                                  >
                                    <span>Cukup Layak</span>
                                    <svg className="w-2.5 h-2.5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                  </button>
                                )}
                                {item.keterangan === "KURANG LAYAK" && (
                                  <button 
                                    onClick={() => setJustificationModal({ open: true, laptop: item })}
                                    className="bg-rose-50 hover:bg-rose-100 border border-rose-100 text-rose-700 font-bold px-2.5 py-1 rounded-full text-[10px] uppercase tracking-wider transition-colors flex items-center gap-1 mx-auto shadow-sm"
                                  >
                                    <span>Kurang Layak</span>
                                    <svg className="w-2.5 h-2.5 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={6} className="p-8 text-center text-slate-400">
                              Tidak ada laptop yang cocok dengan pencarian Anda.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 2: CRITERIA WEIGHT MANAGEMENT */}
              {activeTab === "criteria" && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Kriteria & Bobot Penilaian</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Ubah persentase kriteria. Perhitungan peringkat akan langsung di-update secara real-time.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-5">
                      {criteria.map((c) => (
                        <div key={c.kode} className="bg-slate-50 border border-brand-border p-4 rounded-[16px] space-y-3">
                          <div className="flex justify-between items-center">
                            <div>
                              <span className="text-xs font-bold text-brand-primary">{c.kode}</span>
                              <span className="text-xs font-bold text-slate-800 ml-2">{c.name}</span>
                            </div>
                            <span className="bg-white border border-slate-200 px-2 py-0.5 rounded text-[10px] font-bold text-slate-400 uppercase">
                              {c.type}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-4">
                            <input 
                              type="range" 
                              min="0" 
                              max="1" 
                              step="0.05"
                              value={tempWeights[c.kode] ?? c.weight}
                              onChange={(e) => handleTempWeightChange(c.kode, e.target.value)}
                              className="w-full accent-brand-primary cursor-pointer"
                            />
                            <span className="font-mono font-bold text-xs bg-white border border-slate-200 w-16 text-center py-1 rounded">
                              {((tempWeights[c.kode] ?? c.weight) * 100).toFixed(0)}%
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="bg-slate-50 border border-brand-border rounded-[16px] p-5 space-y-4 flex flex-col justify-between">
                      <div className="space-y-4">
                        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Informasi Kriteria (Kepmendag No. 2060/2025)</h4>
                        <ul className="text-[11px] text-slate-500 space-y-2.5 list-disc list-inside leading-relaxed">
                          <li><strong>C1 (TKDN + BMP)</strong>: Minimal 25% TKDN dan 40% BMP. Atribut benefit (bobot 30%).</li>
                          <li><strong>C2 (Kapasitas RAM)</strong>: Spesifikasi minimal 8 GB. Atribut benefit (bobot 25%).</li>
                          <li><strong>C3 (Kapasitas SSD)</strong>: Spesifikasi minimal 256 GB. Atribut benefit (bobot 20%).</li>
                          <li><strong>C4 (Masa Garansi)</strong>: Masa garansi minimal 1 tahun. Atribut benefit (bobot 15%).</li>
                          <li><strong>C5 (Harga Satuan)</strong>: Efisiensi anggaran. Atribut cost (bobot 10%).</li>
                        </ul>
                      </div>
                      
                      <div className="pt-4 border-t border-brand-border space-y-4">
                        <div className="flex justify-between text-xs font-bold items-center">
                          <span>Total Kontribusi Bobot:</span>
                          <span className={`px-2.5 py-1 rounded-full text-xs font-black ${
                            tempTotalPercentage === 100 
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-100" 
                              : "bg-rose-50 text-rose-700 border border-rose-100 animate-pulse"
                          }`}>
                            {tempTotalPercentage}%
                          </span>
                        </div>

                        {/* Validasi & Status */}
                        {tempTotalPercentage !== 100 ? (
                          <div className="bg-rose-50/50 border border-rose-100 rounded-xl p-3.5 space-y-2">
                            <p className="text-[11px] text-rose-600 font-semibold leading-relaxed">
                              ⚠️ Total kontribusi bobot kriteria harus tepat bernilai <b>100%</b> agar perhitungan SPK SAW valid. Saat ini total bobot Anda adalah <b>{tempTotalPercentage}%</b>.
                            </p>
                            <button
                              type="button"
                              onClick={handleAutoNormalizeWeights}
                              className="w-full bg-white hover:bg-rose-50 border border-rose-200 text-rose-700 text-[10px] font-black py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 shadow-sm"
                            >
                              ⚡ Selesaikan / Normalisasikan Otomatis ke 100%
                            </button>
                          </div>
                        ) : (
                          <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-3.5">
                            <p className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1.5">
                              ✨ Total bobot sudah sesuai (100%). Perhitungan siap disimpan dan diterapkan.
                            </p>
                          </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex gap-3 pt-2">
                          <button
                            type="button"
                            onClick={() => {
                              const initial = {}
                              criteria.forEach(c => {
                                initial[c.kode] = c.weight
                              })
                              setTempWeights(initial)
                              showToast("Bobot dikembalikan ke setelan database", "info")
                            }}
                            className="flex-1 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold py-2.5 rounded-lg transition-colors shadow-sm"
                          >
                            Batal
                          </button>
                          
                          <button
                            type="button"
                            onClick={saveWeights}
                            disabled={tempTotalPercentage !== 100 || loading}
                            className={`flex-1 text-xs font-bold py-2.5 rounded-lg shadow-sm transition-all text-white ${
                              tempTotalPercentage === 100 && !loading
                                ? "bg-brand-primary hover:bg-brand-primary-hover cursor-pointer"
                                : "bg-slate-300 cursor-not-allowed opacity-60"
                            }`}
                          >
                            {loading ? "Menyimpan..." : "Simpan Bobot"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: ADMIN CRUD ALTERNATIVES */}
              {activeTab === "crud" && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Kelola Alternatif Laptop</h3>
                      <p className="text-xs text-slate-500 mt-0.5">Tambah, ubah, atau hapus alternatif laptop yang dievaluasi.</p>
                    </div>
                    <button 
                      onClick={openCreateModal}
                      className="bg-brand-primary hover:bg-brand-primary-hover text-white text-xs font-bold px-4 py-2.5 rounded-lg shadow-sm transition-colors"
                    >
                      Tambah Laptop
                    </button>
                  </div>

                  <div className="overflow-x-auto border border-brand-border rounded-[16px]">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-brand-border text-slate-700 font-bold">
                          <th className="p-3.5 w-16 text-center">KODE</th>
                          <th className="p-3.5">NAMA PRODUK</th>
                          <th className="p-3.5">MEREK</th>
                          <th className="p-3.5 text-center">C1 (TKDN)</th>
                          <th className="p-3.5 text-center">C2 (RAM)</th>
                          <th className="p-3.5 text-center">C3 (SSD)</th>
                          <th className="p-3.5 text-center">C4 (GRS)</th>
                          <th className="p-3.5 text-right">C5 (HARGA)</th>
                          <th className="p-3.5 w-28 text-center">AKSI</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-brand-border">
                        {alternatives.map((alt) => (
                          <tr key={alt.id} className="hover:bg-slate-50/50">
                            <td className="p-3.5 text-center font-mono font-bold text-slate-400">{alt.kode}</td>
                            <td className="p-3.5 font-semibold text-slate-900">{alt.name}</td>
                            <td className="p-3.5 text-slate-500">{alt.brand}</td>
                            <td className="p-3.5 text-center font-medium">{alt.c1_tkdn}%</td>
                            <td className="p-3.5 text-center font-medium">{alt.c2_ram} GB</td>
                            <td className="p-3.5 text-center font-medium">{alt.c3_ssd} GB</td>
                            <td className="p-3.5 text-center font-medium">{alt.c4_warranty} Thn</td>
                            <td className="p-3.5 text-right font-mono font-bold text-slate-500">{formatRupiah(alt.c5_price)}</td>
                            <td className="p-3.5 text-center flex justify-center gap-1.5">
                              <button 
                                onClick={() => openEditModal(alt)}
                                className="border border-brand-primary text-brand-primary hover:bg-slate-50 text-[10px] font-bold px-2 py-1 rounded transition-colors"
                              >
                                Edit
                              </button>
                              <button 
                                onClick={() => handleLaptopDelete(alt.id, alt.name)}
                                className="border border-rose-200 text-rose-500 hover:bg-rose-50 text-[10px] font-bold px-2 py-1 rounded transition-colors"
                              >
                                Hapus
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 4: STEP-BY-STEP SAW MATRICES */}
              {activeTab === "saw-steps" && (
                <div className="space-y-8">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Langkah Perhitungan SAW</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Penelusuran transparan dari data mentah hingga keputusan akhir.</p>
                  </div>

                  {/* Tabel Aturan Konversi Keanggotaan Fuzzy Setiap Kriteria */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Aturan Konversi Keanggotaan Fuzzy Setiap Kriteria
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Klasifikasi dan konversi nilai riil kriteria laptop ke dalam skala fuzzy [0.25, 0.33, 0.50, 0.67, 0.75, 1.00] sesuai standar regulasi dan preferensi.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      
                      {/* C1 - TKDN */}
                      <div className="bg-white border border-brand-border rounded-[16px] overflow-hidden shadow-sm flex flex-col">
                        <div className="bg-emerald-500 text-white text-[10px] font-bold py-2 px-3 uppercase tracking-wider text-center">
                          C1 - Nilai TKDN + BMP (%) [BENEFIT]
                        </div>
                        <div className="p-3.5 flex-1">
                          <table className="w-full text-left text-[11px] border-collapse">
                            <thead>
                              <tr className="border-b border-brand-border text-slate-400 font-bold">
                                <th className="pb-2 w-8 text-center">No</th>
                                <th className="pb-2">Batas Nilai TKDN + BMP</th>
                                <th className="pb-2 text-center w-20">Nilai Fuzzy</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-brand-border text-slate-700 font-medium">
                              <tr>
                                <td className="py-2 text-center font-bold">1</td>
                                <td className="py-2">TKDN &lt; 45%</td>
                                <td className="py-2 text-center font-bold text-brand-primary">0,25</td>
                              </tr>
                              <tr>
                                <td className="py-2 text-center font-bold">2</td>
                                <td className="py-2">45% &le; TKDN &lt; 50%</td>
                                <td className="py-2 text-center font-bold text-brand-primary">0,50</td>
                              </tr>
                              <tr>
                                <td className="py-2 text-center font-bold">3</td>
                                <td className="py-2">50% &le; TKDN &lt; 55%</td>
                                <td className="py-2 text-center font-bold text-brand-primary">0,75</td>
                              </tr>
                              <tr>
                                <td className="py-2 text-center font-bold">4</td>
                                <td className="py-2">TKDN &ge; 55%</td>
                                <td className="py-2 text-center font-bold text-brand-primary">1,00</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* C2 - RAM */}
                      <div className="bg-white border border-brand-border rounded-[16px] overflow-hidden shadow-sm flex flex-col">
                        <div className="bg-emerald-500 text-white text-[10px] font-bold py-2 px-3 uppercase tracking-wider text-center">
                          C2 - Kapasitas RAM (GB) [BENEFIT]
                        </div>
                        <div className="p-3.5 flex-1">
                          <table className="w-full text-left text-[11px] border-collapse">
                            <thead>
                              <tr className="border-b border-brand-border text-slate-400 font-bold">
                                <th className="pb-2 w-8 text-center">No</th>
                                <th className="pb-2">Kapasitas RAM</th>
                                <th className="pb-2 text-center w-20">Nilai Fuzzy</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-brand-border text-slate-700 font-medium">
                              <tr>
                                <td className="py-2 text-center font-bold">1</td>
                                <td className="py-2">RAM = 8 GB</td>
                                <td className="py-2 text-center font-bold text-brand-primary">0,25</td>
                              </tr>
                              <tr>
                                <td className="py-2 text-center font-bold">2</td>
                                <td className="py-2">RAM = 16 GB</td>
                                <td className="py-2 text-center font-bold text-brand-primary">0,50</td>
                              </tr>
                              <tr>
                                <td className="py-2 text-center font-bold">3</td>
                                <td className="py-2">RAM = 32 GB</td>
                                <td className="py-2 text-center font-bold text-brand-primary">0,75</td>
                              </tr>
                              <tr>
                                <td className="py-2 text-center font-bold">4</td>
                                <td className="py-2">RAM &gt; 32 GB</td>
                                <td className="py-2 text-center font-bold text-brand-primary">1,00</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* C3 - SSD */}
                      <div className="bg-white border border-brand-border rounded-[16px] overflow-hidden shadow-sm flex flex-col">
                        <div className="bg-emerald-500 text-white text-[10px] font-bold py-2 px-3 uppercase tracking-wider text-center">
                          C3 - Kapasitas SSD (GB) [BENEFIT]
                        </div>
                        <div className="p-3.5 flex-1">
                          <table className="w-full text-left text-[11px] border-collapse">
                            <thead>
                              <tr className="border-b border-brand-border text-slate-400 font-bold">
                                <th className="pb-2 w-8 text-center">No</th>
                                <th className="pb-2">Kapasitas SSD</th>
                                <th className="pb-2 text-center w-20">Nilai Fuzzy</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-brand-border text-slate-700 font-medium">
                              <tr>
                                <td className="py-2 text-center font-bold">1</td>
                                <td className="py-2">SSD = 256 GB</td>
                                <td className="py-2 text-center font-bold text-brand-primary">0,33</td>
                              </tr>
                              <tr>
                                <td className="py-2 text-center font-bold">2</td>
                                <td className="py-2">SSD = 512 GB</td>
                                <td className="py-2 text-center font-bold text-brand-primary">0,67</td>
                              </tr>
                              <tr>
                                <td className="py-2 text-center font-bold">3</td>
                                <td className="py-2">SSD &ge; 1024 GB (1 TB)</td>
                                <td className="py-2 text-center font-bold text-brand-primary">1,00</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* C4 - Garansi */}
                      <div className="bg-white border border-brand-border rounded-[16px] overflow-hidden shadow-sm flex flex-col">
                        <div className="bg-emerald-500 text-white text-[10px] font-bold py-2 px-3 uppercase tracking-wider text-center">
                          C4 - Masa Garansi (Tahun) [BENEFIT]
                        </div>
                        <div className="p-3.5 flex-1">
                          <table className="w-full text-left text-[11px] border-collapse">
                            <thead>
                              <tr className="border-b border-brand-border text-slate-400 font-bold">
                                <th className="pb-2 w-8 text-center">No</th>
                                <th className="pb-2">Masa Garansi</th>
                                <th className="pb-2 text-center w-20">Nilai Fuzzy</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-brand-border text-slate-700 font-medium">
                              <tr>
                                <td className="py-2 text-center font-bold">1</td>
                                <td className="py-2">Garansi = 1 Tahun</td>
                                <td className="py-2 text-center font-bold text-brand-primary">0,25</td>
                              </tr>
                              <tr>
                                <td className="py-2 text-center font-bold">2</td>
                                <td className="py-2">Garansi = 2 Tahun</td>
                                <td className="py-2 text-center font-bold text-brand-primary">0,50</td>
                              </tr>
                              <tr>
                                <td className="py-2 text-center font-bold">3</td>
                                <td className="py-2">Garansi = 3 Tahun</td>
                                <td className="py-2 text-center font-bold text-brand-primary">0,75</td>
                              </tr>
                              <tr>
                                <td className="py-2 text-center font-bold">4</td>
                                <td className="py-2">Garansi &gt; 3 Tahun</td>
                                <td className="py-2 text-center font-bold text-brand-primary">1,00</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* C5 - Harga */}
                      <div className="bg-white border border-brand-border rounded-[16px] overflow-hidden shadow-sm flex flex-col">
                        <div className="bg-amber-500 text-white text-[10px] font-bold py-2 px-3 uppercase tracking-wider text-center">
                          C5 - Harga Satuan (Rp) [COST]
                        </div>
                        <div className="p-3.5 flex-1">
                          <table className="w-full text-left text-[11px] border-collapse">
                            <thead>
                              <tr className="border-b border-brand-border text-slate-400 font-bold">
                                <th className="pb-2 w-8 text-center">No</th>
                                <th className="pb-2">Batas Harga Satuan</th>
                                <th className="pb-2 text-center w-20">Nilai Fuzzy</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-brand-border text-slate-700 font-medium">
                              <tr>
                                <td className="py-2 text-center font-bold">1</td>
                                <td className="py-2">Harga &le; Rp 11.000.000</td>
                                <td className="py-2 text-center font-bold text-brand-primary">0,25</td>
                              </tr>
                              <tr>
                                <td className="py-2 text-center font-bold">2</td>
                                <td className="py-2">Rp 11 jt &lt; Harga &le; Rp 14 jt</td>
                                <td className="py-2 text-center font-bold text-brand-primary">0,50</td>
                              </tr>
                              <tr>
                                <td className="py-2 text-center font-bold">3</td>
                                <td className="py-2">Rp 14 jt &lt; Harga &le; Rp 17 jt</td>
                                <td className="py-2 text-center font-bold text-brand-primary">0,75</td>
                              </tr>
                              <tr>
                                <td className="py-2 text-center font-bold">4</td>
                                <td className="py-2">Harga &gt; Rp 17.000.000</td>
                                <td className="py-2 text-center font-bold text-brand-primary">1,00</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>

                    </div>
                  </div>

                  {sawData && (
                    <div className="space-y-8">

                      {/* Pagination Control */}
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50 border border-brand-border rounded-[16px] p-4 shadow-sm">
                        <div className="text-xs text-slate-500 font-semibold">
                          Menampilkan baris <span className="font-bold text-slate-800">{((currentSawPage - 1) * itemsPerPage) + 1}</span> - <span className="font-bold text-slate-800">{Math.min(currentSawPage * itemsPerPage, sawData.fuzzy_matrix.length)}</span> dari <span className="font-bold text-slate-800">{sawData.fuzzy_matrix.length}</span> laptop
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => setSawPage(prev => Math.max(prev - 1, 1))}
                            disabled={currentSawPage === 1}
                            className="px-3 py-1.5 rounded-lg border border-brand-border bg-white text-[11px] font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                          >
                            Sebelumnya
                          </button>
                          <div className="flex items-center gap-1">
                            {Array.from({ length: totalSawPages }, (_, i) => i + 1).map((p) => (
                              <button
                                key={p}
                                onClick={() => setSawPage(p)}
                                className={`w-7 h-7 flex items-center justify-center rounded-lg text-[11px] font-bold transition-all ${
                                  currentSawPage === p
                                    ? "bg-brand-primary text-white shadow-sm"
                                    : "border border-brand-border bg-white text-slate-600 hover:bg-slate-50"
                                }`}
                              >
                                {p}
                              </button>
                            ))}
                          </div>
                          <button
                            onClick={() => setSawPage(prev => Math.min(prev + 1, totalSawPages))}
                            disabled={currentSawPage === totalSawPages}
                            className="px-3 py-1.5 rounded-lg border border-brand-border bg-white text-[11px] font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                          >
                            Selanjutnya
                          </button>
                        </div>
                      </div>

                      {/* Step 1: Fuzzy Matrix */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Langkah 1: Matriks Keanggotaan Fuzzy (f_ij)</h4>
                        </div>
                        <p className="text-[11px] text-slate-500">Konversi nilai real laptop ke fuzzy [0.25, 0.50, 0.75, 1.00] sesuai kriteria keanggotaan.</p>
                        <div className="overflow-x-auto border border-brand-border rounded-[16px]">
                          <table className="w-full text-left border-collapse text-[11px] table-fixed">
                            <thead>
                              <tr className="bg-slate-50 border-b border-brand-border text-slate-700 font-bold">
                                <th className="p-2.5 w-16 text-center">KODE</th>
                                <th className="p-2.5 w-48">NAMA LAPTOP</th>
                                <th className="p-2.5 text-center">f_C1</th>
                                <th className="p-2.5 text-center">f_C2</th>
                                <th className="p-2.5 text-center">f_C3</th>
                                <th className="p-2.5 text-center">f_C4</th>
                                <th className="p-2.5 text-center">f_C5</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-brand-border">
                              {paginatedFuzzyMatrix.map((row) => (
                                <tr key={row.kode} className="hover:bg-slate-50/50">
                                  <td className="p-2.5 text-center font-mono font-semibold text-slate-400">{row.kode}</td>
                                  <td className="p-2.5 font-medium truncate text-slate-900">{row.name}</td>
                                  <td className="p-2.5 text-center font-semibold text-brand-primary">{row.f_c1.toFixed(2)}</td>
                                  <td className="p-2.5 text-center font-semibold text-brand-primary">{row.f_c2.toFixed(2)}</td>
                                  <td className="p-2.5 text-center font-semibold text-brand-primary">{row.f_c3.toFixed(2)}</td>
                                  <td className="p-2.5 text-center font-semibold text-brand-primary">{row.f_c4.toFixed(2)}</td>
                                  <td className="p-2.5 text-center font-semibold text-brand-primary">{row.f_c5.toFixed(2)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Step 2: Normalized Matrix */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Langkah 2: Matriks Normalisasi (R)</h4>
                        </div>
                        <p className="text-[11px] text-slate-500">Normalisasi: Benefit = f_ij / max(f_j) [C1-C4] | Cost = min(f_j) / f_ij [C5].</p>
                        <div className="overflow-x-auto border border-brand-border rounded-[16px]">
                          <table className="w-full text-left border-collapse text-[11px] table-fixed">
                            <thead>
                              <tr className="bg-slate-50 border-b border-brand-border text-slate-700 font-bold">
                                <th className="p-2.5 w-16 text-center">KODE</th>
                                <th className="p-2.5 w-48">NAMA LAPTOP</th>
                                <th className="p-2.5 text-center">r_C1</th>
                                <th className="p-2.5 text-center">r_C2</th>
                                <th className="p-2.5 text-center">r_C3</th>
                                <th className="p-2.5 text-center">r_C4</th>
                                <th className="p-2.5 text-center">r_C5</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-brand-border">
                              {paginatedNormalizedMatrix.map((row) => (
                                <tr key={row.kode} className="hover:bg-slate-50/50">
                                  <td className="p-2.5 text-center font-mono font-semibold text-slate-400">{row.kode}</td>
                                  <td className="p-2.5 font-medium truncate text-slate-900">{row.name}</td>
                                  <td className="p-2.5 text-center font-semibold text-brand-primary">{row.r_c1.toFixed(4)}</td>
                                  <td className="p-2.5 text-center font-semibold text-brand-primary">{row.r_c2.toFixed(4)}</td>
                                  <td className="p-2.5 text-center font-semibold text-brand-primary">{row.r_c3.toFixed(4)}</td>
                                  <td className="p-2.5 text-center font-semibold text-brand-primary">{row.r_c4.toFixed(4)}</td>
                                  <td className="p-2.5 text-center font-semibold text-brand-primary">{row.r_c5.toFixed(4)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>
        )}

      </main>

      {/* MODAL CRUD LAPTOP */}
      <LaptopFormModal 
        isOpen={isCrudModalOpen}
        onClose={() => setIsCrudModalOpen(false)}
        onSubmit={handleLaptopSubmit}
        initialData={selectedLaptop}
        crudMode={crudMode}
        errorMsg={crudError}
      />

      {/* MODAL JUSTIFIKASI STATUS KELAYAKAN */}
      {justificationModal.open && justificationModal.laptop && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-fade-in">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" 
            onClick={() => setJustificationModal({ open: false, laptop: null })}
          />
          
          {/* Modal Container */}
          <div className="bg-white rounded-[24px] border border-slate-100 shadow-2xl w-full max-w-md overflow-hidden relative z-10 transform scale-100 transition-all p-6 md:p-8">
            
            {/* Header */}
            <div className="flex justify-between items-start mb-6">
              <div>
                <span className="font-mono text-[10px] text-slate-400 font-bold bg-slate-100 px-2 py-0.5 rounded">
                  KODE {justificationModal.laptop.kode}
                </span>
                <h3 className="text-lg font-black text-slate-900 mt-2 leading-snug">
                  {justificationModal.laptop.name}
                </h3>
                <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
                  Merek: {justificationModal.laptop.brand}
                </p>
              </div>
              <button 
                onClick={() => setJustificationModal({ open: false, laptop: null })}
                className="text-slate-400 hover:text-slate-600 transition-colors p-1 bg-slate-50 rounded-full"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Content Body */}
            <div className="space-y-5">
              {/* Score and Rank */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 border border-slate-100 rounded-2xl p-4 text-center">
                <div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Skor Kelayakan (V_i)</p>
                  <p className="text-xl font-black text-brand-primary mt-1">
                    {justificationModal.laptop.v_i.toFixed(4)}
                  </p>
                </div>
                <div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Peringkat Akhir</p>
                  <p className="text-xl font-black text-slate-800 mt-1">
                    Rank #{justificationModal.laptop.rank}
                  </p>
                </div>
              </div>

              {/* Status Kelayakan Card */}
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status Kelayakan</p>
                <div className="flex items-start gap-3">
                  {justificationModal.laptop.keterangan === "SANGAT LAYAK" && (
                    <div className="flex flex-col gap-1.5">
                      <div>
                        <span className="bg-emerald-50 border border-emerald-100 text-emerald-700 font-bold px-3 py-1 rounded-full text-[10px] uppercase tracking-wider">
                          Sangat Layak
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 font-medium leading-relaxed mt-1">
                        Laptop ini masuk dalam jajaran **15% alternatif terbaik** berdasarkan bobot kriteria Anda. Direkomendasikan sebagai pilihan utama pengadaan.
                      </p>
                    </div>
                  )}
                  {justificationModal.laptop.keterangan === "CUKUP LAYAK" && (
                    <div className="flex flex-col gap-1.5">
                      <div>
                        <span className="bg-amber-50 border border-amber-100 text-amber-700 font-bold px-3 py-1 rounded-full text-[10px] uppercase tracking-wider">
                          Cukup Layak
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 font-medium leading-relaxed mt-1">
                        Laptop ini berada pada rentang menengah-atas. Cukup berimbang untuk dipertimbangkan sebagai opsi pengadaan cadangan.
                      </p>
                    </div>
                  )}
                  {justificationModal.laptop.keterangan === "KURANG LAYAK" && (
                    <div className="flex flex-col gap-1.5">
                      <div>
                        <span className="bg-rose-50 border border-rose-100 text-rose-700 font-bold px-3 py-1 rounded-full text-[10px] uppercase tracking-wider">
                          Kurang Layak
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 font-medium leading-relaxed mt-1">
                        Laptop ini berada di **15% alternatif terbawah**. Tidak disarankan kecuali anggaran sangat terbatas atau kriteria tertentu lebih diprioritaskan.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Justifikasi Aspek */}
              <div className="border-t border-slate-100 pt-4 space-y-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Justifikasi Kriteria</p>
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex gap-3 items-start">
                  <div className="bg-white border border-slate-100 shadow-sm p-1.5 rounded-xl text-brand-primary flex-shrink-0 mt-0.5">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <p className="text-xs text-slate-600 font-semibold leading-relaxed">
                    {justificationModal.laptop.justifikasi}
                  </p>
                </div>
              </div>
            </div>

            {/* Footer / Close Button */}
            <div className="mt-6">
              <button
                onClick={() => setJustificationModal({ open: false, laptop: null })}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-colors shadow-sm"
              >
                Tutup Detail
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  )
}

export default App
