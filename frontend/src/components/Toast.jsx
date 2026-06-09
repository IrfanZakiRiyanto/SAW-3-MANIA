import { useEffect } from "react"

function Toast({ message, type = "success", onClose }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose()
    }, 3000)
    return () => clearTimeout(timer)
  }, [onClose])

  const bgClass = type === "success" 
    ? "bg-emerald-50 border-emerald-200 text-emerald-800" 
    : "bg-rose-50 border-rose-200 text-rose-800"

  const icon = type === "success" ? "✅" : "⚠️"

  return (
    <div className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg animate-fade-in-up animate-gpu ${bgClass}`}>
      <span className="text-base">{icon}</span>
      <span className="text-xs font-bold">{message}</span>
      <button onClick={onClose} className="text-xs font-bold ml-2 opacity-60 hover:opacity-100">×</button>
    </div>
  )
}

export default Toast
