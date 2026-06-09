import { useState, useEffect } from "react"

function LaptopFormModal({ isOpen, onClose, onSubmit, initialData, crudMode, errorMsg }) {
  const [laptopForm, setLaptopForm] = useState({
    kode: "",
    name: "",
    brand: "",
    c1_tkdn: 40.0,
    c2_ram: 8.0,
    c3_ssd: 256.0,
    c4_warranty: 1.0,
    c5_price: 10000000.0
  })

  useEffect(() => {
    if (initialData) {
      setLaptopForm(initialData)
    }
  }, [initialData, isOpen])

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit(laptopForm)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in overflow-y-auto py-10">
      <div className="bg-white border border-brand-border rounded-xl p-6 w-full max-w-lg shadow-xl space-y-4 my-auto animate-fade-in-up animate-gpu">
        <div className="flex justify-between items-center border-b border-brand-border pb-3">
          <h3 className="text-sm font-bold text-brand-dark">
            {crudMode === "create" ? "Tambah Alternatif Laptop" : "Edit Alternatif Laptop"}
          </h3>
          <button 
            onClick={onClose}
            className="text-brand-gray hover:text-brand-dark text-lg"
          >
            ×
          </button>
        </div>

        {errorMsg && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 p-2.5 rounded text-xs font-semibold">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="font-bold text-brand-gray">KODE LAPTOP</label>
              <input 
                type="text" 
                value={laptopForm.kode}
                disabled={crudMode === "edit"}
                onChange={(e) => setLaptopForm({ ...laptopForm, kode: e.target.value })}
                className="w-full border border-brand-border px-3 py-2 rounded-lg focus:outline-brand-primary disabled:bg-slate-100"
                placeholder="A01"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="font-bold text-brand-gray">MEREK</label>
              <input 
                type="text" 
                value={laptopForm.brand}
                onChange={(e) => setLaptopForm({ ...laptopForm, brand: e.target.value })}
                className="w-full border border-brand-border px-3 py-2 rounded-lg focus:outline-brand-primary"
                placeholder="Lenovo"
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="font-bold text-brand-gray">NAMA PRODUK / MODEL</label>
            <input 
              type="text" 
              value={laptopForm.name}
              onChange={(e) => setLaptopForm({ ...laptopForm, name: e.target.value })}
              className="w-full border border-brand-border px-3 py-2 rounded-lg focus:outline-brand-primary"
              placeholder="Lenovo IdeaPad Slim 3"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4 border-t border-brand-border pt-4">
            <div className="space-y-1">
              <label className="font-bold text-brand-gray">C1: TKDN + BMP (%)</label>
              <input 
                type="number" 
                step="0.01"
                value={laptopForm.c1_tkdn}
                onChange={(e) => setLaptopForm({ ...laptopForm, c1_tkdn: parseFloat(e.target.value) })}
                className="w-full border border-brand-border px-3 py-2 rounded-lg focus:outline-brand-primary"
                min="0"
                max="100"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="font-bold text-brand-gray">C2: RAM (GB)</label>
              <input 
                type="number" 
                value={laptopForm.c2_ram}
                onChange={(e) => setLaptopForm({ ...laptopForm, c2_ram: parseFloat(e.target.value) })}
                className="w-full border border-brand-border px-3 py-2 rounded-lg focus:outline-brand-primary"
                min="1"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="font-bold text-brand-gray">C3: SSD (GB)</label>
              <input 
                type="number" 
                value={laptopForm.c3_ssd}
                onChange={(e) => setLaptopForm({ ...laptopForm, c3_ssd: parseFloat(e.target.value) })}
                className="w-full border border-brand-border px-3 py-2 rounded-lg focus:outline-brand-primary"
                min="1"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="font-bold text-brand-gray">C4: GARANSI (TAHUN)</label>
              <input 
                type="number" 
                step="0.5"
                value={laptopForm.c4_warranty}
                onChange={(e) => setLaptopForm({ ...laptopForm, c4_warranty: parseFloat(e.target.value) })}
                className="w-full border border-brand-border px-3 py-2 rounded-lg focus:outline-brand-primary"
                min="0.5"
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="font-bold text-brand-gray">C5: HARGA SATUAN (RP)</label>
            <input 
              type="number" 
              value={laptopForm.c5_price}
              onChange={(e) => setLaptopForm({ ...laptopForm, c5_price: parseFloat(e.target.value) })}
              className="w-full border border-brand-border px-3 py-2 rounded-lg focus:outline-brand-primary font-mono"
              min="1"
              required
            />
          </div>

          <button 
            type="submit"
            className="w-full bg-brand-primary hover:bg-brand-primary-hover text-white text-xs font-bold py-2.5 rounded-lg shadow transition-colors mt-2"
          >
            {crudMode === "create" ? "Simpan Alternatif Baru" : "Simpan Perubahan"}
          </button>
        </form>
      </div>
    </div>
  )
}

export default LaptopFormModal
