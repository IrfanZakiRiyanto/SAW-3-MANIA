import { useState, useEffect, useCallback } from "react"
import AuthScreen from "./components/AuthScreen"
import Toast from "./components/Toast"
import LaptopFormModal from "./components/LaptopFormModal"

function App() {
  // Authentication & Layout States
  const [currentUser, setCurrentUser] = useState(null)
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true)
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
  }

  // Handle Logout
  const handleLogout = () => {
    setCurrentUser(null)
    showToast("Anda telah keluar dari aplikasi", "success")
  }

  // Handle Weight Update
  const handleWeightUpdate = async (kode, newWeight) => {
    try {
      const res = await fetch(`${API_URL}/criteria/${kode}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weight: parseFloat(newWeight) })
      })
      if (res.ok) {
        await fetchData()
        showToast(`Bobot ${kode} berhasil diperbarui!`, "success")
      } else {
        showToast("Gagal memperbarui bobot kriteria", "error")
      }
    } catch (err) {
      showToast("Error koneksi server", "error")
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
          if (sortBy === "price_asc") return a.c5_price - b.c5_price
          if (sortBy === "price_desc") return b.c5_price - a.c5_price
          if (sortBy === "ram_desc") return b.c2_ram - a.c2_ram
          if (sortBy === "tkdn_desc") return b.c1_tkdn - a.c1_tkdn
          return 0
        })
    : []

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
        className={`bg-white border-r border-brand-border h-full flex flex-col justify-between transition-all duration-300 ease-in-out z-20 ${
          isSidebarExpanded ? "w-64" : "w-20"
        }`}
      >
        
        {/* Top: Logo & Toggle Button */}
        <div>
          <div className="p-5 flex items-center justify-between border-b border-brand-border min-h-[81px]">
            {isSidebarExpanded ? (
              <div className="flex items-center gap-2 overflow-hidden animate-fade-in">
                <div className="w-2.5 h-6 bg-brand-primary rounded-sm" />
                <div>
                  <h1 className="text-xs font-black text-slate-900 tracking-wider">SPK SAW LAPTOP</h1>
                  <p className="text-[9px] text-slate-400 font-bold tracking-widest uppercase">KEMENDAG RI</p>
                </div>
              </div>
            ) : (
              <div className="mx-auto text-xs font-black text-brand-primary">SPK</div>
            )}
            
            {/* Collapse Toggle Button */}
            {isSidebarExpanded && (
              <button 
                onClick={() => setIsSidebarExpanded(false)}
                className="text-slate-400 hover:text-brand-primary text-xs font-bold transition-colors"
                title="Collapse Sidebar"
              >
                Tutup
              </button>
            )}
          </div>

          {/* Menu Navigation */}
          <nav className="p-4 space-y-1.5">
            
            {/* Expanded Sidebar expand toggle back */}
            {!isSidebarExpanded && (
              <button 
                onClick={() => setIsSidebarExpanded(true)}
                className="w-full flex items-center justify-center p-3 text-slate-400 hover:text-brand-primary hover:bg-slate-50 rounded-[12px] transition-all text-xs font-bold border border-transparent hover:border-slate-100"
                title="Expand Sidebar"
              >
                Buka
              </button>
            )}

            <button 
              onClick={() => setActiveTab("ranking")}
              className={`w-full flex items-center justify-start p-3 rounded-[12px] font-bold text-xs transition-all ${
                activeTab === "ranking" 
                  ? "bg-brand-primary text-white shadow-sm" 
                  : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              {!isSidebarExpanded && <span className="mx-auto">RANK</span>}
              {isSidebarExpanded && <span className="animate-fade-in overflow-hidden whitespace-nowrap">Rangking Keputusan</span>}
            </button>

            <button 
              onClick={() => setActiveTab("criteria")}
              className={`w-full flex items-center justify-start p-3 rounded-[12px] font-bold text-xs transition-all ${
                activeTab === "criteria" 
                  ? "bg-brand-primary text-white shadow-sm" 
                  : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              {!isSidebarExpanded && <span className="mx-auto">WGHT</span>}
              {isSidebarExpanded && <span className="animate-fade-in overflow-hidden whitespace-nowrap">Atur Bobot</span>}
            </button>

            <button 
              onClick={() => setActiveTab("crud")}
              className={`w-full flex items-center justify-start p-3 rounded-[12px] font-bold text-xs transition-all ${
                activeTab === "crud" 
                  ? "bg-brand-primary text-white shadow-sm" 
                  : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              {!isSidebarExpanded && <span className="mx-auto">DATA</span>}
              {isSidebarExpanded && <span className="animate-fade-in overflow-hidden whitespace-nowrap">Kelola Laptop</span>}
            </button>

            <button 
              onClick={() => setActiveTab("saw-steps")}
              className={`w-full flex items-center justify-start p-3 rounded-[12px] font-bold text-xs transition-all ${
                activeTab === "saw-steps" 
                  ? "bg-brand-primary text-white shadow-sm" 
                  : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              {!isSidebarExpanded && <span className="mx-auto">MTRX</span>}
              {isSidebarExpanded && <span className="animate-fade-in overflow-hidden whitespace-nowrap">Matriks SAW</span>}
            </button>
          </nav>
        </div>

        {/* Bottom: Profile & Logout */}
        <div className="p-4 border-t border-brand-border">
          <div className="flex flex-col gap-2">
            
            {isSidebarExpanded ? (
              <div className="bg-slate-50 border border-brand-border p-3 rounded-[12px] space-y-2 overflow-hidden animate-fade-in">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span className="text-[10px] font-bold text-slate-700 truncate max-w-[120px] uppercase tracking-wider">
                    Operator: {currentUser.username}
                  </span>
                </div>
                <button 
                  onClick={handleLogout}
                  className="w-full bg-rose-500 hover:bg-rose-600 text-white text-[10px] font-bold py-1.5 rounded-lg shadow-sm transition-colors uppercase tracking-wider"
                >
                  Keluar
                </button>
              </div>
            ) : (
              <button 
                onClick={handleLogout}
                className="w-full flex items-center justify-center p-3 text-rose-500 hover:bg-rose-50 rounded-[12px] transition-all text-[10px] font-bold"
                title="Logout"
              >
                OUT
              </button>
            )}

            {isSidebarExpanded && (
              <div className="text-[9px] text-center text-slate-400 font-semibold mt-1">
                Koneksi API: {isConnected ? "Aktif" : "Terputus"}
              </div>
            )}

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
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Rekomendasi</p>
                  <h4 className="text-3xl font-black text-slate-900 mt-1">{stats.recommended_count}</h4>
                  <p className="text-[9px] text-emerald-600 mt-1 font-bold">Skor V_i {">="} 0.8000</p>
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
                                {item.v_i >= 0.8 ? (
                                  <span className="bg-emerald-50 border border-emerald-100 text-emerald-700 font-bold px-2.5 py-1 rounded text-[10px] uppercase tracking-wider">
                                    Sangat Layak
                                  </span>
                                ) : (
                                  <span className="bg-slate-100 border border-slate-200 text-slate-500 font-semibold px-2.5 py-1 rounded text-[10px] uppercase tracking-wider">
                                    Tidak Direkomendasikan
                                  </span>
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
                              value={c.weight}
                              onChange={(e) => handleWeightUpdate(c.kode, e.target.value)}
                              className="w-full accent-brand-primary cursor-pointer"
                            />
                            <span className="font-mono font-bold text-xs bg-white border border-slate-200 w-16 text-center py-1 rounded">
                              {(c.weight * 100).toFixed(0)}%
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="bg-slate-50 border border-brand-border rounded-[16px] p-5 space-y-4">
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Informasi Kriteria (Kepmendag No. 2060/2025)</h4>
                      <ul className="text-[11px] text-slate-500 space-y-2.5 list-disc list-inside leading-relaxed">
                        <li><strong>C1 (TKDN + BMP)</strong>: Minimal 25% TKDN dan 40% BMP. Atribut benefit (bobot 30%).</li>
                        <li><strong>C2 (Kapasitas RAM)</strong>: Spesifikasi minimal 8 GB. Atribut benefit (bobot 25%).</li>
                        <li><strong>C3 (Kapasitas SSD)</strong>: Spesifikasi minimal 256 GB. Atribut benefit (bobot 20%).</li>
                        <li><strong>C4 (Masa Garansi)</strong>: Masa garansi minimal 1 tahun. Atribut benefit (bobot 15%).</li>
                        <li><strong>C5 (Harga Satuan)</strong>: Efisiensi anggaran. Atribut cost (bobot 10%).</li>
                      </ul>
                      <div className="pt-2 border-t border-brand-border">
                        <div className="flex justify-between text-xs font-bold">
                          <span>Total Kontribusi Bobot:</span>
                          <span className="text-brand-primary">
                            {(criteria.reduce((sum, c) => sum + c.weight, 0) * 100).toFixed(0)}%
                          </span>
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

                  {sawData && (
                    <div className="space-y-8">
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
                              {sawData.fuzzy_matrix.slice(0, 15).map((row) => (
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
                              {sawData.fuzzy_matrix.length > 15 && (
                                <tr>
                                  <td colSpan={7} className="p-2.5 text-center text-slate-400 italic bg-slate-50/55">
                                    + {sawData.fuzzy_matrix.length - 15} laptop lainnya (disembunyikan untuk performa)
                                  </td>
                                </tr>
                              )}
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
                              {sawData.normalized_matrix.slice(0, 15).map((row) => (
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
                              {sawData.normalized_matrix.length > 15 && (
                                <tr>
                                  <td colSpan={7} className="p-2.5 text-center text-slate-400 italic bg-slate-50/55">
                                    + {sawData.normalized_matrix.length - 15} laptop lainnya (disembunyikan untuk performa)
                                  </td>
                                </tr>
                              )}
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

    </div>
  )
}

export default App
