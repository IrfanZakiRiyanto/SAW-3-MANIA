import { useState } from "react"

function AuthScreen({ onLoginSuccess, showToast, API_URL }) {
  const [mode, setMode] = useState("login") // login, register, forgot
  
  // Form States
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)

  // Clear fields on mode change
  const changeMode = (newMode) => {
    setMode(newMode)
    setUsername("")
    setPassword("")
    setConfirmPassword("")
  }

  // Handle Login
  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      })
      const data = await res.json()
      if (res.ok) {
        showToast("Login berhasil! Selamat datang", "success")
        onLoginSuccess(data.user)
      } else {
        showToast(data.detail || "Username atau password salah", "error")
      }
    } catch (err) {
      showToast("Gagal terhubung ke server backend", "error")
    } finally {
      setLoading(false)
    }
  }

  // Handle Register
  const handleRegister = async (e) => {
    e.preventDefault()
    if (password !== confirmPassword) {
      showToast("Konfirmasi password tidak cocok", "error")
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      })
      const data = await res.json()
      if (res.ok) {
        showToast("Registrasi berhasil! Silakan login", "success")
        changeMode("login")
      } else {
        showToast(data.detail || "Gagal melakukan registrasi", "error")
      }
    } catch (err) {
      showToast("Gagal terhubung ke server backend", "error")
    } finally {
      setLoading(false)
    }
  }

  // Handle Forgot Password
  const handleForgot = (e) => {
    e.preventDefault()
    showToast("Instruksi reset password telah dikirim ke administrator", "success")
    changeMode("login")
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center items-center p-4 md:p-6 font-sans">
      
      {/* Outer Card Wrapper (Background Green Gradient) */}
      <div className="relative bg-gradient-to-br from-emerald-400 via-brand-primary to-emerald-600 w-full max-w-4xl rounded-[24px] shadow-2xl overflow-hidden min-h-[550px] border border-slate-100/50 animate-fade-in animate-gpu">
        
        {/* SVG Cloud Shape Overlay (Binds both columns on desktop) */}
        <div className="absolute inset-0 w-full h-full pointer-events-none z-0 hidden md:block">
          <svg className="w-full h-full fill-white" viewBox="0 0 800 500" preserveAspectRatio="none">
            <path d="M 0,0 
                     L 380,0 
                     C 440,30 480,40 530,90 
                     C 580,140 680,90 800,160 
                     L 800,360 
                     C 700,320 630,420 510,420 
                     C 430,420 380,500 300,500 
                     L 220,500 
                     C 170,500 130,420 0,430 
                     Z" />
          </svg>
        </div>

        {/* Mobile Wavy Panel Fallback (SVG covers background vertically on mobile) */}
        <div className="absolute inset-0 w-full h-full pointer-events-none z-0 block md:hidden">
          <div className="w-full h-full bg-white opacity-95" />
        </div>

        {/* Content Layout Grid */}
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-12 w-full min-h-[550px]">
          
          {/* Left Column: Form Panel (White area on Left) */}
          <div className="md:col-span-7 p-8 md:p-12 flex flex-col justify-between min-h-[450px]">
            
            {/* Top Logo */}
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2.5 h-5 bg-brand-primary rounded-sm" />
              <span className="text-xs font-black tracking-wider text-slate-800">SPK SAW LAPTOP</span>
            </div>

            {/* Form Content */}
            <div className="my-auto space-y-6">
              <div>
                <h2 className="text-2xl font-black text-slate-900 leading-none">
                  {mode === "login" && "Halo!"}
                  {mode === "register" && "Buat Akun"}
                  {mode === "forgot" && "Reset Sandi"}
                </h2>
                <p className="text-xs text-slate-400 mt-2 font-medium">
                  {mode === "login" && "Silakan masuk untuk mengakses panel keputusan."}
                  {mode === "register" && "Daftarkan kredensial operator baru Anda."}
                  {mode === "forgot" && "Masukkan username Anda untuk pemulihan akun."}
                </p>
              </div>

              {/* LOGIN FORM */}
              {mode === "login" && (
                <form onSubmit={handleLogin} className="space-y-4">
                  
                  {/* Username Input */}
                  <div className="relative flex items-center">
                    <svg className="w-4 h-4 text-slate-400 absolute left-4 pointer-events-none" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <input 
                      type="text" 
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-100 rounded-full pl-11 pr-5 py-3 text-xs focus:outline-none focus:border-brand-primary focus:bg-white font-semibold text-slate-800 shadow-inner transition-all"
                      placeholder="Username"
                      required
                    />
                  </div>

                  {/* Password Input */}
                  <div className="relative flex items-center">
                    <svg className="w-4 h-4 text-slate-400 absolute left-4 pointer-events-none" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <input 
                      type="password" 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-100 rounded-full pl-11 pr-5 py-3 text-xs focus:outline-none focus:border-brand-primary focus:bg-white text-slate-800 shadow-inner transition-all"
                      placeholder="Password"
                      required
                    />
                  </div>

                  {/* Extra Options Row */}
                  <div className="flex justify-between items-center text-[10px] px-2">
                    <label className="flex items-center gap-1.5 text-slate-400 font-bold cursor-pointer">
                      <input type="checkbox" className="accent-brand-primary rounded" />
                      Ingat Saya
                    </label>
                    <button 
                      type="button" 
                      onClick={() => changeMode("forgot")}
                      className="text-brand-primary hover:text-brand-primary-hover font-bold"
                    >
                      Lupa Password?
                    </button>
                  </div>

                  {/* Submit button */}
                  <button 
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-brand-primary to-emerald-500 hover:from-brand-primary-hover hover:to-emerald-600 text-white text-xs font-bold py-3.5 rounded-full shadow-md hover:shadow-lg transition-all transform active:scale-[0.98]"
                  >
                    {loading ? "Memproses..." : "MASUK"}
                  </button>

                </form>
              )}

              {/* REGISTER FORM */}
              {mode === "register" && (
                <form onSubmit={handleRegister} className="space-y-4">
                  
                  {/* Username */}
                  <div className="relative flex items-center">
                    <svg className="w-4 h-4 text-slate-400 absolute left-4 pointer-events-none" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <input 
                      type="text" 
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-100 rounded-full pl-11 pr-5 py-3 text-xs focus:outline-none focus:border-brand-primary focus:bg-white font-semibold text-slate-800 shadow-inner transition-all"
                      placeholder="Buat Username"
                      required
                    />
                  </div>

                  {/* Password */}
                  <div className="relative flex items-center">
                    <svg className="w-4 h-4 text-slate-400 absolute left-4 pointer-events-none" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <input 
                      type="password" 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-100 rounded-full pl-11 pr-5 py-3 text-xs focus:outline-none focus:border-brand-primary focus:bg-white text-slate-800 shadow-inner transition-all"
                      placeholder="Buat Password"
                      required
                    />
                  </div>

                  {/* Confirm Password */}
                  <div className="relative flex items-center">
                    <svg className="w-4 h-4 text-slate-400 absolute left-4 pointer-events-none" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m-3.418 3.84a6 6 0 1110.836-3.08l-.837.838a4 4 0 00-5.656 0l-1.5 1.5a4 4 0 000 5.656l1.5-1.5a4 4 0 00-1.5-5.656z" />
                    </svg>
                    <input 
                      type="password" 
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-100 rounded-full pl-11 pr-5 py-3 text-xs focus:outline-none focus:border-brand-primary focus:bg-white text-slate-800 shadow-inner transition-all"
                      placeholder="Konfirmasi Password"
                      required
                    />
                  </div>

                  {/* Submit button */}
                  <button 
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-brand-primary to-emerald-500 hover:from-brand-primary-hover hover:to-emerald-600 text-white text-xs font-bold py-3.5 rounded-full shadow-md hover:shadow-lg transition-all transform active:scale-[0.98]"
                  >
                    {loading ? "Memproses..." : "DAFTAR AKUN"}
                  </button>

                </form>
              )}

              {/* FORGOT PASSWORD FORM */}
              {mode === "forgot" && (
                <form onSubmit={handleForgot} className="space-y-4">
                  
                  {/* Username Input */}
                  <div className="relative flex items-center">
                    <svg className="w-4 h-4 text-slate-400 absolute left-4 pointer-events-none" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <input 
                      type="text" 
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-100 rounded-full pl-11 pr-5 py-3 text-xs focus:outline-none focus:border-brand-primary focus:bg-white font-semibold text-slate-800 shadow-inner transition-all"
                      placeholder="Username Terdaftar"
                      required
                    />
                  </div>

                  {/* Submit button */}
                  <button 
                    type="submit"
                    className="w-full bg-gradient-to-r from-brand-primary to-emerald-500 hover:from-brand-primary-hover hover:to-emerald-600 text-white text-xs font-bold py-3.5 rounded-full shadow-md hover:shadow-lg transition-all"
                  >
                    KIRIM RESET LINK
                  </button>

                </form>
              )}
            </div>

            {/* Bottom toggle mode text */}
            <div className="text-center text-xs pt-4 border-t border-slate-50">
              {mode === "login" && (
                <span className="text-slate-400">
                  Belum memiliki akun?{" "}
                  <button onClick={() => changeMode("register")} className="text-brand-primary hover:text-brand-primary-hover font-bold ml-0.5">
                    Daftar
                  </button>
                </span>
              )}
              {(mode === "register" || mode === "forgot") && (
                <span className="text-slate-400">
                  Sudah terdaftar?{" "}
                  <button onClick={() => changeMode("login")} className="text-brand-primary hover:text-brand-primary-hover font-bold ml-0.5">
                    Login
                  </button>
                </span>
              )}
            </div>

          </div>

          {/* Right Column: Decorative Welcome Panel (Positioned on top of White Cloud SVG) */}
          <div className="hidden md:flex md:col-span-5 relative p-8 flex-col justify-center items-center text-center text-slate-800">
            
            {/* Content (Welcome text on white cloud area) */}
            <div className="relative z-10 space-y-3 max-w-[200px] text-slate-800">
              <h3 className="text-xl font-black tracking-tight leading-tight text-slate-900">
                Welcome Back!
              </h3>
              <p className="text-[10px] text-slate-400 leading-relaxed font-bold">
                Sistem Pendukung Keputusan Pengadaan Laptop E-Katalog Kantor Pusat Kemendag RI.
              </p>
            </div>

          </div>

        </div>

      </div>

    </div>
  )
}

export default AuthScreen
