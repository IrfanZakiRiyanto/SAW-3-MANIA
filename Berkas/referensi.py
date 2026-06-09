import pandas as pd
import random
import xlsxwriter

# 1. Generate 75 alternatif data dummy sesuai syarat minimal
data = []
for i in range(1, 76):
    data.append([
        f'Laptop A{i}',
        round(random.uniform(40.0, 60.0), 2),       # C1: TKDN (Min 40%)
        random.choice([8, 16, 32, 64]),             # C2: RAM (Min 8GB)
        random.choice([256, 512, 1024]),            # C3: SSD (Hanya 3 kategori: 256, 512, 1TB)
        random.choice([1, 2, 3, 4]),                # C4: Garansi (Min 1 Tahun)
        random.randrange(8500000, 19500000, 500000) # C5: Harga (8.5jt - 19.5jt)
    ])

# 2. Buat file Excel
file_name = 'Sistem_SPK_SAW_Fuzzy_Final.xlsx'
workbook = xlsxwriter.Workbook(file_name)
worksheet = workbook.add_worksheet('Perhitungan SAW')

# --- FORMATTING WARNA & STYLE ---
header_format = workbook.add_format({'bold': True, 'bg_color': '#4F81BD', 'font_color': 'white', 'border': 1, 'align': 'center', 'valign': 'vcenter'})
fuzzy_header = workbook.add_format({'bold': True, 'bg_color': '#9BBB59', 'font_color': 'white', 'border': 1, 'align': 'center'})
norm_header = workbook.add_format({'bold': True, 'bg_color': '#F79646', 'font_color': 'white', 'border': 1, 'align': 'center'})
currency_format = workbook.add_format({'num_format': 'Rp #,##0', 'border': 1})
border_format = workbook.add_format({'border': 1, 'align': 'center'})
highlight_format = workbook.add_format({'bold': True, 'bg_color': '#FFFF00', 'border': 1, 'align': 'center'})

# --- TABEL BOBOT (W) ---
worksheet.write('A1', 'KRITERIA', header_format)
headers = ['C1 (TKDN)', 'C2 (RAM)', 'C3 (SSD)', 'C4 (Garansi)', 'C5 (Harga)']
bobot = [0.20, 0.20, 0.20, 0.15, 0.25] # Bobot disesuaikan dengan kesepakatan kalian

for col_num, data_val in enumerate(headers):
    worksheet.write(0, col_num + 1, data_val, header_format)
worksheet.write('A2', 'BOBOT (W)', border_format)
for col_num, data_val in enumerate(bobot):
    worksheet.write(1, col_num + 1, data_val, border_format)

# --- HEADER TABEL UTAMA ---
# Data Mentah (A4:F4)
worksheet.write('A4', 'Alternatif', header_format)
for col_num, data_val in enumerate(headers):
    worksheet.write(3, col_num + 1, data_val, header_format)

# Data Fuzzy (H4:L4)
fuzzy_cols = ['Fuzzy C1', 'Fuzzy C2', 'Fuzzy C3', 'Fuzzy C4', 'Fuzzy C5']
for col_num, data_val in enumerate(fuzzy_cols):
    worksheet.write(3, col_num + 7, data_val, fuzzy_header)

# Normalisasi & Nilai V (N4:S4)
norm_cols = ['Norm C1', 'Norm C2', 'Norm C3', 'Norm C4', 'Norm C5', 'NILAI AKHIR (V)']
for col_num, data_val in enumerate(norm_cols):
    worksheet.write(3, col_num + 13, data_val, norm_header)

# --- INJEKSI DATA DAN RUMUS ---
row = 4
for item in data:
    # Tulis Data Mentah
    worksheet.write(row, 0, item[0], border_format)
    worksheet.write(row, 1, item[1], border_format)
    worksheet.write(row, 2, item[2], border_format)
    worksheet.write(row, 3, item[3], border_format)
    worksheet.write(row, 4, item[4], border_format)
    worksheet.write(row, 5, item[5], currency_format)
    
    # RUMUS FUZZY (Nested IF)
    # H: Fuzzy C1 (TKDN)
    worksheet.write_formula(row, 7, f'=IF(B{row+1}<45, 0.25, IF(B{row+1}<50, 0.5, IF(B{row+1}<55, 0.75, 1)))', border_format)
    
    # I: Fuzzy C2 (RAM)
    worksheet.write_formula(row, 8, f'=IF(C{row+1}<=8, 0.25, IF(C{row+1}<=16, 0.5, IF(C{row+1}<=32, 0.75, 1)))', border_format)
    
    # J: Fuzzy C3 (SSD) -> DIUBAH JADI 3 KATEGORI (0.33, 0.67, 1)
    worksheet.write_formula(row, 9, f'=IF(D{row+1}<=256, 0.33, IF(D{row+1}<=512, 0.67, 1))', border_format)
    
    # K: Fuzzy C4 (Garansi)
    worksheet.write_formula(row, 10, f'=IF(E{row+1}<=1, 0.25, IF(E{row+1}<=2, 0.5, IF(E{row+1}<=3, 0.75, 1)))', border_format)
    
    # L: Fuzzy C5 (Harga)
    worksheet.write_formula(row, 11, f'=IF(F{row+1}<=11000000, 0.25, IF(F{row+1}<=14000000, 0.5, IF(F{row+1}<=17000000, 0.75, 1)))', border_format)

    # RUMUS NORMALISASI (Max untuk C1-C4, Min untuk C5)
    worksheet.write_formula(row, 13, f'=H{row+1}/H$81', border_format) # N: Norm C1
    worksheet.write_formula(row, 14, f'=I{row+1}/I$81', border_format) # O: Norm C2
    worksheet.write_formula(row, 15, f'=J{row+1}/J$81', border_format) # P: Norm C3
    worksheet.write_formula(row, 16, f'=K{row+1}/K$81', border_format) # Q: Norm C4
    worksheet.write_formula(row, 17, f'=L$82/L{row+1}', border_format) # R: Norm C5 (Cost dibalik)
    
    # RUMUS NILAI PREFERENSI (V)
    worksheet.write_formula(row, 18, f'=(N{row+1}*$B$2)+(O{row+1}*$C$2)+(P{row+1}*$D$2)+(Q{row+1}*$E$2)+(R{row+1}*$F$2)', highlight_format)
    
    row += 1

# --- MAX & MIN UNTUK NORMALISASI FUZZY ---
worksheet.write('G81', 'MAX (BENEFIT):', highlight_format)
worksheet.write_formula('H81', '=MAX(H5:H79)', highlight_format)
worksheet.write_formula('I81', '=MAX(I5:I79)', highlight_format)
worksheet.write_formula('J81', '=MAX(J5:J79)', highlight_format)
worksheet.write_formula('K81', '=MAX(K5:K79)', highlight_format)

worksheet.write('G82', 'MIN (COST):', highlight_format)
worksheet.write_formula('L82', '=MIN(L5:L79)', highlight_format)

# Set lebar kolom biar rapi
worksheet.set_column('A:A', 12)
worksheet.set_column('B:E', 12)
worksheet.set_column('F:F', 15)
worksheet.set_column('H:L', 10)
worksheet.set_column('N:S', 12)

workbook.close()
print("Excel FINAL berhasil dibuat: Sistem_SPK_SAW_Fuzzy_Final.xlsx")