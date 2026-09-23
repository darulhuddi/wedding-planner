import os
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.datavalidation import DataValidation
from openpyxl.chart import BarChart, DoughnutChart, Reference, Series
from openpyxl.formatting.rule import CellIsRule

def build_wedding_planner(output_filename="WedSiap_Wedding_Planner_CompetitorStyle.xlsx"):
    wb = openpyxl.Workbook()
    # Remove default sheet
    default_sheet = wb.active
    wb.remove(default_sheet)

    # Brand Colors
    C_PLUM = "6B214F"        # Burgundy / dark plum
    C_DARK_PLUM = "4E183B"   # Dark plum
    C_SOFT_PINK = "F3D9E5"   # Soft pink
    C_LIGHT_PINK = "FAEEF4"  # Very light pink
    C_MUTED_ROSE = "C96A91"  # Muted rose
    C_SOFT_PURPLE = "6651A6" # Soft purple
    C_LAVENDER = "E8E3F5"    # Lavender
    C_SOFT_MINT = "DDEFEA"   # Soft mint
    C_MINT_TEXT = "195C4D"   # Dark mint text
    C_ROSE_TEXT = "9C2243"   # Dark rose text
    C_PURPLE_TEXT = "3E2B75" # Dark purple text
    C_MUTED_GOLD = "B89A70"  # Muted gold
    C_TEXT = "332C30"        # Charcoal text
    C_WHITE = "FFFFFF"
    C_BORDER = "D9C5CE"      # Soft pink border
    C_BORDER_PLUM = "944D73" # Accent border
    C_PILL_YELLOW = "FFF3CD" # Soft yellow pill
    C_YELLOW_TEXT = "856404"
    C_PILL_GRAY = "EFEBE9"   # Soft gray pill

    # Styles
    font_family = "Segoe UI"
    font_title = Font(name=font_family, size=15, bold=True, color=C_WHITE)
    font_subtitle = Font(name=font_family, size=9.5, italic=True, color=C_MUTED_ROSE)
    font_section = Font(name=font_family, size=11, bold=True, color=C_DARK_PLUM)
    font_section_white = Font(name=font_family, size=11, bold=True, color=C_WHITE)
    font_header = Font(name=font_family, size=9.5, bold=True, color=C_DARK_PLUM)
    font_header_white = Font(name=font_family, size=9.5, bold=True, color=C_WHITE)
    font_body = Font(name=font_family, size=9, color=C_TEXT)
    font_body_bold = Font(name=font_family, size=9, bold=True, color=C_TEXT)
    font_kpi_label = Font(name=font_family, size=8.5, bold=True, color=C_WHITE)
    font_kpi_val = Font(name=font_family, size=14, bold=True, color=C_DARK_PLUM)
    font_kpi_sub = Font(name=font_family, size=8, italic=True, color=C_MUTED_ROSE)

    fill_plum = PatternFill(start_color=C_PLUM, end_color=C_PLUM, fill_type="solid")
    fill_dark_plum = PatternFill(start_color=C_DARK_PLUM, end_color=C_DARK_PLUM, fill_type="solid")
    fill_soft_pink = PatternFill(start_color=C_SOFT_PINK, end_color=C_SOFT_PINK, fill_type="solid")
    fill_light_pink = PatternFill(start_color=C_LIGHT_PINK, end_color=C_LIGHT_PINK, fill_type="solid")
    fill_muted_rose = PatternFill(start_color=C_MUTED_ROSE, end_color=C_MUTED_ROSE, fill_type="solid")
    fill_soft_mint = PatternFill(start_color=C_SOFT_MINT, end_color=C_SOFT_MINT, fill_type="solid")
    fill_lavender = PatternFill(start_color=C_LAVENDER, end_color=C_LAVENDER, fill_type="solid")
    fill_white = PatternFill(start_color=C_WHITE, end_color=C_WHITE, fill_type="solid")
    fill_gold = PatternFill(start_color="F5EFE6", end_color="F5EFE6", fill_type="solid")

    thin_border_side = Side(border_style="thin", color=C_BORDER)
    thin_border = Border(left=thin_border_side, right=thin_border_side, top=thin_border_side, bottom=thin_border_side)
    thick_bottom_side = Side(border_style="medium", color=C_PLUM)
    double_bottom_side = Side(border_style="double", color=C_PLUM)
    header_border = Border(left=thin_border_side, right=thin_border_side, top=thin_border_side, bottom=thick_bottom_side)
    total_border = Border(left=thin_border_side, right=thin_border_side, top=thin_border_side, bottom=double_bottom_side)

    align_center = Alignment(horizontal="center", vertical="center")
    align_left = Alignment(horizontal="left", vertical="center")
    align_right = Alignment(horizontal="right", vertical="center")
    align_wrap_left = Alignment(horizontal="left", vertical="center", wrap_text=True)

    CURRENCY_FORMAT = '"Rp"#,##0'
    PERCENT_FORMAT = '0.0%'
    NUMBER_FORMAT = '#,##0'

    def create_banner(ws, title, subtitle="", max_col=10):
        ws.merge_cells(start_row=2, start_column=2, end_row=2, end_column=max_col)
        cell = ws.cell(row=2, column=2, value=f"  {title.upper()}  ")
        cell.font = font_title
        cell.fill = fill_plum
        cell.alignment = Alignment(horizontal="left", vertical="center")
        ws.row_dimensions[2].height = 36

        for c in range(2, max_col + 1):
            ws.cell(row=2, column=c).fill = fill_plum

        if subtitle:
            ws.merge_cells(start_row=3, start_column=2, end_row=3, end_column=max_col)
            sub_cell = ws.cell(row=3, column=2, value=f"  {subtitle}  ")
            sub_cell.font = font_subtitle
            sub_cell.fill = fill_light_pink
            sub_cell.alignment = Alignment(horizontal="left", vertical="center")
            ws.row_dimensions[3].height = 20
            for c in range(2, max_col + 1):
                ws.cell(row=3, column=c).fill = fill_light_pink

    def create_kpi_card(ws, start_row, start_col, width_cols, label, value_formula, format_str=CURRENCY_FORMAT):
        end_col = start_col + width_cols - 1
        ws.merge_cells(start_row=start_row, start_column=start_col, end_row=start_row, end_column=end_col)
        lbl_cell = ws.cell(row=start_row, column=start_col, value=label)
        lbl_cell.font = font_kpi_label
        lbl_cell.fill = fill_plum
        lbl_cell.alignment = align_center
        ws.row_dimensions[start_row].height = 20
        for c in range(start_col, end_col + 1):
            ws.cell(row=start_row, column=c).fill = fill_plum

        ws.merge_cells(start_row=start_row+1, start_column=start_col, end_row=start_row+2, end_column=end_col)
        val_cell = ws.cell(row=start_row+1, column=start_col, value=value_formula)
        val_cell.font = font_kpi_val
        val_cell.fill = fill_light_pink
        val_cell.alignment = align_center
        val_cell.number_format = format_str

        card_side = Side(border_style="thin", color=C_BORDER_PLUM)
        for r in range(start_row, start_row + 3):
            for c in range(start_col, end_col + 1):
                cell = ws.cell(row=r, column=c)
                lb = card_side if c == start_col else None
                rb = card_side if c == end_col else None
                tb = card_side if r == start_row else None
                bb = card_side if r == start_row + 2 else None
                cell.border = Border(left=lb, right=rb, top=tb, bottom=bb)
        ws.row_dimensions[start_row+1].height = 16
        ws.row_dimensions[start_row+2].height = 16

    # =========================================================================
    # SHEET 1: 01 — START HERE
    # =========================================================================
    ws1 = wb.create_sheet(title="01 — START HERE")
    ws1.views.sheetView[0].showGridLines = True
    create_banner(ws1, "WEDDING PLANNER", "Semua persiapan pernikahanmu, lebih terarah.", max_col=9)

    ws1.merge_cells("B5:I5")
    w_title = ws1.cell(row=5, column=2, value="💍  PANDUAN MEMULAI PERSIAPAN PERNIKAHAN")
    w_title.font = font_section
    w_title.fill = fill_soft_pink
    w_title.alignment = Alignment(horizontal="left", vertical="center", indent=1)
    ws1.row_dimensions[5].height = 28
    for c in range(2, 10):
        ws1.cell(row=5, column=c).fill = fill_soft_pink
        ws1.cell(row=5, column=c).border = thin_border

    profile_data = [
        ("Nama Pasangan", "Rina & Arif", "Tanggal Pernikahan", "12 Oktober 2026"),
        ("Lokasi Akad & Resepsi", "Grand Harmony Hotel, Jakarta Selatan", "Target Tamu / Kursi", "250 Undangan (500 Tamu / Pax)"),
        ("Alokasi Total Budget", 120000000, "Konsep Acara", "Romantic Warm Floral & Intimate Elegance"),
    ]
    for idx, row in enumerate(profile_data, start=6):
        ws1.cell(row=idx, column=2, value=row[0]).font = font_body_bold
        ws1.cell(row=idx, column=2).fill = fill_light_pink
        ws1.cell(row=idx, column=2).border = thin_border
        
        c3 = ws1.cell(row=idx, column=3, value=row[1])
        c3.font = font_body
        c3.border = thin_border
        if isinstance(row[1], (int, float)):
            c3.number_format = CURRENCY_FORMAT
        ws1.merge_cells(start_row=idx, start_column=3, end_row=idx, end_column=5)

        ws1.cell(row=idx, column=6, value=row[2]).font = font_body_bold
        ws1.cell(row=idx, column=6).fill = fill_light_pink
        ws1.cell(row=idx, column=6).border = thin_border

        c7 = ws1.cell(row=idx, column=7, value=row[3])
        c7.font = font_body
        c7.border = thin_border
        ws1.merge_cells(start_row=idx, start_column=7, end_row=idx, end_column=9)
        ws1.row_dimensions[idx].height = 22

    ws1.merge_cells("B10:I10")
    s_title = ws1.cell(row=10, column=2, value="📋  7 LANGKAH MUDAH PENGGUNAAN TEMPLATE")
    s_title.font = font_section
    s_title.fill = fill_soft_pink
    s_title.alignment = Alignment(horizontal="left", vertical="center", indent=1)
    ws1.row_dimensions[10].height = 26
    for c in range(2, 10):
        ws1.cell(row=10, column=c).fill = fill_soft_pink
        ws1.cell(row=10, column=c).border = thin_border

    steps = [
        ("1", "Mulai dari Budget", "03 — BUDGET", "Tentukan batas kemampuan dan alokasikan estimasi dana untuk venue, catering, dekorasi, hingga dana darurat."),
        ("2", "Cicil Checklist", "04 — CHECKLIST", "Cek tugas berdasarkan fase waktu (12-9 bulan s/d Hari H). Update status saat tugas selesai."),
        ("3", "Catat & Kunci Vendor", "06 — VENDOR", "Simpan nomor kontak, tanggal pelunasan, DP yang sudah dibayar, serta rincian kontrak kerja sama."),
        ("4", "Susun Daftar Tamu", "07 — GUEST LIST", "Kelompokkan tamu dari CPW/CPP, jenis undangan (cetak/digital), jumlah kursi, dan pantau status RSVP."),
        ("5", "Atur Seserahan", "08 — SESERAHAN", "Catat barang seserahan berdasarkan 8 kategori rapi, lengkap dengan brand impian dan anggarannya."),
        ("6", "Lengkapi Administrasi", "09 — ADMINISTRASI", "Ikuti checklist berkas KUA/Catatan Sipil dan pahami 6 tahapan alur pendaftaran secara terstruktur."),
        ("7", "Pantau di Dashboard", "02 — DASHBOARD", "Lihat gambaran besar persiapan, sisa budget, progress checklist, dan grafik interaktif secara otomatis.")
    ]

    ws1.cell(row=11, column=2, value="NO").alignment = align_center
    ws1.cell(row=11, column=3, value="LANGKAH UTAMA").alignment = align_left
    ws1.cell(row=11, column=4, value="SHEET TUJUAN").alignment = align_center
    ws1.cell(row=11, column=5, value="PANDUAN & CARA MENGISI").alignment = align_left
    ws1.merge_cells("E11:I11")
    for c in range(2, 10):
        cell = ws1.cell(row=11, column=c)
        cell.font = font_header
        cell.fill = fill_soft_pink
        cell.border = header_border
    ws1.row_dimensions[11].height = 24

    for idx, (s_no, s_name, s_sheet, s_desc) in enumerate(steps, start=12):
        ws1.cell(row=idx, column=2, value=s_no).alignment = align_center
        ws1.cell(row=idx, column=3, value=s_name).alignment = align_left
        c_sheet = ws1.cell(row=idx, column=4, value=s_sheet)
        c_sheet.alignment = align_center
        c_sheet.font = Font(name=font_family, size=9.5, bold=True, color=C_PLUM)
        ws1.cell(row=idx, column=5, value=s_desc).alignment = align_wrap_left
        ws1.merge_cells(start_row=idx, start_column=5, end_row=idx, end_column=9)
        ws1.row_dimensions[idx].height = 26
        for c in range(2, 10):
            cell = ws1.cell(row=idx, column=c)
            if c != 4: cell.font = font_body
            cell.border = thin_border
            if idx % 2 == 1:
                cell.fill = fill_light_pink

    ws1.merge_cells("B20:I20")
    t_title = ws1.cell(row=20, column=2, value="💡  TIPS PENTING WEDDING PLANNING (SIMPLE & REAL)")
    t_title.font = font_section_white
    t_title.fill = fill_plum
    t_title.alignment = Alignment(horizontal="left", vertical="center", indent=1)
    ws1.row_dimensions[20].height = 26
    for c in range(2, 10):
        ws1.cell(row=20, column=c).fill = fill_plum
        ws1.cell(row=20, column=c).border = thin_border

    tips = [
        "1. Kunci Tanggal & Venue Terlebih Dahulu: Venue dan tanggal cantik di Indonesia seringkali di-booking 9-12 bulan sebelumnya.",
        "2. Alokasikan Dana Cadangan Minimal 5%: Pengeluaran mendadak selalu terjadi (tambahan porsi keluarga, seragam dadakan, tips kru).",
        "3. Jangan Bayar Pelunasan Sebelum H-14: Simpan termin pelunasan mendekati Hari H setelah seluruh pesanan diverifikasi tuntas.",
        "4. Komunikasi Terbuka dengan Kedua Keluarga: Sepakati sejak awal porsi undangan dan pembagian tanggung jawab agar tetap harmonis."
    ]
    for idx, tip in enumerate(tips, start=21):
        ws1.merge_cells(start_row=idx, start_column=2, end_row=idx, end_column=9)
        cell = ws1.cell(row=idx, column=2, value=tip)
        cell.font = font_body
        cell.fill = fill_light_pink
        cell.alignment = Alignment(horizontal="left", vertical="center", indent=1)
        for c in range(2, 10):
            ws1.cell(row=idx, column=c).border = thin_border
            ws1.cell(row=idx, column=c).fill = fill_light_pink
        ws1.row_dimensions[idx].height = 22

    # Column widths for Sheet 1
    ws1_col_widths = {2: 8, 3: 22, 4: 18, 5: 18, 6: 22, 7: 18, 8: 18, 9: 25}
    for col_idx, width in ws1_col_widths.items():
        ws1.column_dimensions[get_column_letter(col_idx)].width = width
    ws1.column_dimensions["A"].width = 3

    # =========================================================================
    # SHEET 3: 03 — BUDGET
    # =========================================================================
    ws3 = wb.create_sheet(title="03 — BUDGET")
    ws3.views.sheetView[0].showGridLines = True
    create_banner(ws3, "BUDGET PERNIKAHAN", "Rincian alokasi dana, estimasi vendor, pembayaran DP, dan realisasi pengeluaran.", max_col=13)

    # Top KPI Cards on Budget Sheet
    create_kpi_card(ws3, start_row=5, start_col=2, width_cols=2, label="TOTAL ANGGARAN", value_formula="=SUM(G11:G41)")
    create_kpi_card(ws3, start_row=5, start_col=4, width_cols=2, label="TOTAL ESTIMASI", value_formula="=SUM(H11:H41)")
    create_kpi_card(ws3, start_row=5, start_col=6, width_cols=2, label="TOTAL REALISASI", value_formula="=SUM(I11:I41)")
    create_kpi_card(ws3, start_row=5, start_col=8, width_cols=2, label="TOTAL DP DIBAYAR", value_formula="=SUM(J11:J41)")
    create_kpi_card(ws3, start_row=5, start_col=10, width_cols=4, label="SISA BUDGET (ANGGARAN - REALISASI)", value_formula="=B6-F6")

    budget_headers = ["NO", "KATEGORI", "ITEM KEBUTUHAN", "REKOMENDASI VENDOR", "QTY / SATUAN", "ANGGARAN", "ESTIMASI", "REALISASI", "DP DIBAYAR", "SISA BUDGET", "STATUS", "CATATAN / DETAIL"]
    for col_idx, h_text in enumerate(budget_headers, start=2):
        cell = ws3.cell(row=10, column=col_idx, value=h_text)
        cell.font = font_header_white
        cell.fill = fill_plum
        cell.alignment = align_center if col_idx in [2, 6, 12] else (align_right if col_idx in [7, 8, 9, 10, 11] else align_left)
        cell.border = header_border
    ws3.row_dimensions[10].height = 26

    budget_items = [
        # Venue & Gedung
        ("Venue & Gedung", "Sewa Grand Harmony Ballroom", "Grand Harmony Hotel", "1 Paket (6 Jam)", 18000000, 17500000, 17500000, 10000000, "Booked", "Include AC, panggung, listrik 10.000 watt, 2 ruang rias"),
        ("Venue & Gedung", "Biaya Kebersihan & Keamanan Gedung", "Pengelola Gedung", "1 Kali", 1500000, 1500000, 1500000, 1500000, "Lunas", "Wajib disetor H-14"),
        
        # Catering
        ("Catering", "Buffet Utama Nusantara (500 pax)", "Sari Rasa Catering", "500 Pax", 32500000, 31000000, 31000000, 15000000, "Booked", "Menu 6 lauk utama + sop + nasi + puding + buah segar"),
        ("Catering", "Food Stall: Sate Ayam & Siomay", "Sari Rasa Catering", "300 Porsi", 5500000, 5200000, 5200000, 2500000, "Booked", "200 porsi sate + 100 porsi siomay Bandung"),
        ("Catering", "Food Stall: Zuppa Soup & Kambing Guling", "Sari Rasa Catering", "200 Porsi", 6000000, 5800000, 5800000, 3000000, "Booked", "Favorit tamu undangan"),
        ("Catering", "Dessert Bar & Ice Cream Corner", "Gelato Bliss", "250 Cup", 2500000, 2200000, 2200000, 1000000, "Booked", "5 varian rasa gelato premium"),

        # Dekorasi
        ("Dekorasi", "Pelaminan Modern Floral (8 Meter)", "Bloom & Co. Atelier", "1 Paket", 9000000, 8500000, 8500000, 5000000, "Booked", "Kombinasi fresh flowers & artificial premium"),
        ("Dekorasi", "Dekorasi Lorong Masuk & Photo Booth", "Bloom & Co. Atelier", "1 Paket", 3500000, 3000000, 3000000, 1500000, "Booked", "Spot photo gallery 6 frame estetik"),
        ("Dekorasi", "Lighting Ambience & Karpet Jalan", "Bloom & Co. Atelier", "1 Set", 2000000, 1800000, 1800000, 1000000, "Booked", "Warm white ambiance + spotlight pelaminan"),

        # MUA & Busana
        ("MUA & Busana", "Paket Rias Pengantin Akad & Resepsi", "Nadia Beauty MUA", "1 Pasang", 4000000, 3800000, 3800000, 2000000, "Booked", "Include hijab do/hair do & touch up sampai acara usai"),
        ("MUA & Busana", "Sewa Kebaya & Beskap Pengantin", "Sanggar Rias Ayu", "2 Pasang", 3500000, 3200000, 3200000, 2000000, "Booked", "Kebaya putih akad + gaun resepsi terracotta rose"),
        ("MUA & Busana", "Rias & Busana Orang Tua (4 Orang)", "Sanggar Rias Ayu", "4 Orang", 2500000, 2400000, 2400000, 1200000, "Booked", "Seragam kebaya ibu & beskap bapak"),
        ("MUA & Busana", "Rias & Seragam Bridesmaid & Pagar Ayu", "Nadia Beauty Team", "6 Orang", 2000000, 1800000, 1800000, 1000000, "Booked", "Make up natural fresh look"),

        # Dokumentasi
        ("Dokumentasi", "Foto & Cinematic Video (Akad + Resepsi)", "Lensa Kita Photography", "1 Paket", 5500000, 5000000, 5000000, 2500000, "Booked", "2 Fotografer, 1 Videografer, teaser 1 menit + full video"),
        ("Dokumentasi", "Album Kolase Exclusive + Wooden Box USB", "Lensa Kita Photography", "2 Album", 1500000, 1300000, 1300000, 1300000, "Lunas", "Ukuran 20x30 magnetic box"),
        ("Dokumentasi", "Sesi Foto Prewedding Outdoor", "Lensa Kita Photography", "1 Sesi", 2500000, 2200000, 2200000, 2200000, "Lunas", "Lokasi Kebun Raya Bogor (include izin)"),

        # Undangan & Souvenir
        ("Undangan & Souvenir", "Cetak Undangan Fisik Hardcover Premium", "Cerita Kita Undangan", "100 Pcs", 1800000, 1600000, 1600000, 1000000, "Booked", "Foil emas timbul + amplop kalkir"),
        ("Undangan & Souvenir", "Website Undangan Digital & RSVP WhatsApp", "KiteInvites Studio", "1 Paket", 450000, 400000, 400000, 400000, "Lunas", "Domain custom rinaarif.com aktif 1 tahun"),
        ("Undangan & Souvenir", "Souvenir Custom Cutlery Set & Pouch Belacu", "Manis Kenangan Souvenir", "300 Pcs", 3500000, 3200000, 3200000, 2000000, "Booked", "Include kemasan box kraft & thank you card"),

        # Entertainment & Audio
        ("Entertainment", "Akustik Band 4 Player + Singer", "Nada Harmoni Acoustic", "1 Paket (3 Jam)", 2500000, 2200000, 2200000, 1000000, "Booked", "Lagu pop romantis & jazz santai"),
        ("Entertainment", "Professional Master of Ceremony (MC)", "Mas Dimas MC", "Akad & Resepsi", 2000000, 1800000, 1800000, 1000000, "Booked", "Bilingual MC bahasa Indonesia & santun"),
        ("Entertainment", "Sound System 5.000 Watt + Genset", "Thunder Audio Gedung", "1 Paket", 2200000, 2000000, 2000000, 1000000, "Booked", "Microphone wireless 4 unit"),

        # Wedding Organizer
        ("Wedding Organizer", "WO Hari H (6 Orang Onsite Crew)", "Amanah Wedding Organizer", "1 Tim", 4500000, 4000000, 4000000, 2000000, "Booked", "Mengatur rundown, VIP guest, prasmanan, & timeline"),

        # Seserahan & Mahar
        ("Seserahan & Mahar", "Jasa Hias Kotak Akrilik Hantaran", "Kotak Cinta Seserahan", "8 Kotak", 1200000, 1000000, 1000000, 500000, "Booked", "Sewa box akrilik + hias bunga artificial"),
        ("Seserahan & Mahar", "Total Isi Seserahan CPW & CPP", "Beli Mandiri", "Multi Item", 10000000, 9500000, 8900000, 8900000, "Dalam Proses", "Lihat rincian pada sheet 08 — SESERAHAN"),
        ("Seserahan & Mahar", "Cincin Kawin Rose Gold 18K", "Spilla Jewelry", "2 Cincin", 4500000, 4200000, 4200000, 4200000, "Lunas", "Grafir nama internal & kotak kayu custom"),
        ("Seserahan & Mahar", "Frame Logam Mulia Mahar Kaligrafi", "Kreasi Mahar Cantik", "1 Frame", 800000, 750000, 750000, 750000, "Lunas", "Emas antam 5 gram + hiasan koin kuno"),

        # Transport & Akomodasi
        ("Transport & Hotel", "Sewa Mobil Pengantin Alphard Putih", "Royal Executive Rent", "12 Jam", 1800000, 1600000, 1600000, 1000000, "Booked", "Include driver, bensin & pita dekorasi"),
        ("Transport & Hotel", "Kamar Hotel Keluarga & Persiapan", "Grand Harmony Hotel", "2 Kamar (1 Malam)", 1600000, 1500000, 1500000, 1500000, "Lunas", "Dekat dengan ballroom utama"),

        # Administrasi & Dokumen
        ("Administrasi", "Biaya Nikah KUA Luar Kantor & Legalitas", "KUA Setempat", "1 Paket", 900000, 850000, 850000, 850000, "Lunas", "Lihat rincian pada sheet 09 — ADMINISTRASI"),

        # Honeymoon & Cadangan
        ("Honeymoon & Cadangan", "Paket Honeymoon Bali Intimate (4D3N)", "Nusantara Tour", "1 Paket", 4500000, 4200000, 4200000, 2000000, "Booked", "Tiket PP + Private Pool Villa Ubud"),
        ("Honeymoon & Cadangan", "Dana Cadangan / Biaya Tak Terduga (5%)", "Disimpan Tabungan", "Buffer", 5000000, 4000000, 1500000, 1500000, "Dalam Proses", "Untuk tips kru, parkir, dan konsumsi panitia")
    ]

    for idx, item in enumerate(budget_items, start=11):
        ws3.cell(row=idx, column=2, value=idx-10).alignment = align_center
        ws3.cell(row=idx, column=3, value=item[0]).alignment = align_left # Kategori
        ws3.cell(row=idx, column=4, value=item[1]).alignment = align_left # Item
        ws3.cell(row=idx, column=5, value=item[2]).alignment = align_left # Vendor
        ws3.cell(row=idx, column=6, value=item[3]).alignment = align_center # Qty
        
        c_ang = ws3.cell(row=idx, column=7, value=item[4]) # Anggaran (G)
        c_ang.number_format = CURRENCY_FORMAT
        c_ang.alignment = align_right

        c_est = ws3.cell(row=idx, column=8, value=item[5]) # Estimasi (H)
        c_est.number_format = CURRENCY_FORMAT
        c_est.alignment = align_right

        c_real = ws3.cell(row=idx, column=9, value=item[6]) # Realisasi (I)
        c_real.number_format = CURRENCY_FORMAT
        c_real.alignment = align_right

        c_dp = ws3.cell(row=idx, column=10, value=item[7]) # DP (J)
        c_dp.number_format = CURRENCY_FORMAT
        c_dp.alignment = align_right

        c_sisa = ws3.cell(row=idx, column=11, value=f"=G{idx}-I{idx}") # Sisa Budget (K)
        c_sisa.number_format = CURRENCY_FORMAT
        c_sisa.alignment = align_right

        c_status = ws3.cell(row=idx, column=12, value=item[8])
        c_status.alignment = align_center

        c_note = ws3.cell(row=idx, column=13, value=item[9])
        c_note.alignment = align_left

        ws3.row_dimensions[idx].height = 20
        for c in range(2, 14):
            cell = ws3.cell(row=idx, column=c)
            cell.font = font_body
            cell.border = thin_border
            if (idx - 11) % 2 == 1:
                cell.fill = fill_light_pink

    # Total Row
    ws3.merge_cells("B42:F42")
    t_cell = ws3.cell(row=42, column=2, value="TOTAL KESELURUHAN PENGELUARAN")
    t_cell.font = Font(name=font_family, size=10, bold=True, color=C_DARK_PLUM)
    t_cell.alignment = Alignment(horizontal="right", vertical="center")
    t_cell.fill = fill_soft_pink

    for col_c, col_letter in [(7, "G"), (8, "H"), (9, "I"), (10, "J"), (11, "K")]:
        c_tot = ws3.cell(row=42, column=col_c, value=f"=SUM({col_letter}11:{col_letter}41)")
        c_tot.font = Font(name=font_family, size=10, bold=True, color=C_DARK_PLUM)
        c_tot.number_format = CURRENCY_FORMAT
        c_tot.alignment = align_right
        c_tot.fill = fill_soft_pink

    for c in range(2, 14):
        ws3.cell(row=42, column=c).fill = fill_soft_pink
        ws3.cell(row=42, column=c).border = total_border
    ws3.row_dimensions[42].height = 24

    # Dropdown Validation for Budget Status
    dv_status_budget = DataValidation(type="list", formula1='"Belum Mulai,Survey,Dalam Proses,Booked,Lunas"', allow_blank=True)
    ws3.add_data_validation(dv_status_budget)
    dv_status_budget.add("L11:L41")

    # Category Summary Table for Dashboard Charts (Column O to Q)
    ws3.cell(row=10, column=15, value="KATEGORI").font = font_header_white
    ws3.cell(row=10, column=15).fill = fill_plum
    ws3.cell(row=10, column=15).alignment = align_left
    ws3.cell(row=10, column=16, value="ANGGARAN").font = font_header_white
    ws3.cell(row=10, column=16).fill = fill_plum
    ws3.cell(row=10, column=16).alignment = align_right
    ws3.cell(row=10, column=17, value="REALISASI").font = font_header_white
    ws3.cell(row=10, column=17).fill = fill_plum
    ws3.cell(row=10, column=17).alignment = align_right

    categories = [
        "Venue & Gedung",
        "Catering",
        "Dekorasi",
        "MUA & Busana",
        "Dokumentasi",
        "Undangan & Souvenir",
        "Entertainment",
        "Wedding Organizer",
        "Seserahan & Mahar",
        "Transport & Hotel",
        "Administrasi",
        "Honeymoon & Cadangan"
    ]
    for idx, cat in enumerate(categories, start=11):
        ws3.cell(row=idx, column=15, value=cat).font = font_body_bold
        ws3.cell(row=idx, column=15).border = thin_border

        c_ang = ws3.cell(row=idx, column=16, value=f'=SUMIF($C$11:$C$41, "{cat}", $G$11:$G$41)')
        c_ang.font = font_body
        c_ang.number_format = CURRENCY_FORMAT
        c_ang.border = thin_border
        c_ang.alignment = align_right

        c_real = ws3.cell(row=idx, column=17, value=f'=SUMIF($C$11:$C$41, "{cat}", $I$11:$I$41)')
        c_real.font = font_body
        c_real.number_format = CURRENCY_FORMAT
        c_real.border = thin_border
        c_real.alignment = align_right
        ws3.row_dimensions[idx].height = 20

    # Column widths for Sheet 3
    ws3_col_widths = {2: 6, 3: 20, 4: 34, 5: 25, 6: 16, 7: 16, 8: 16, 9: 16, 10: 16, 11: 16, 12: 15, 13: 42, 15: 22, 16: 16, 17: 16}
    for col_idx, width in ws3_col_widths.items():
        ws3.column_dimensions[get_column_letter(col_idx)].width = width
    ws3.column_dimensions["A"].width = 3
    ws3.column_dimensions["N"].width = 3
    ws3.freeze_panes = "D11"

    # =========================================================================
    # SHEET 4: 04 — CHECKLIST
    # =========================================================================
    ws4 = wb.create_sheet(title="04 — CHECKLIST")
    ws4.views.sheetView[0].showGridLines = True
    create_banner(ws4, "CHECKLIST PERSIAPAN PERNIKAHAN", "Pantau seluruh tugas persiapan pernikahanmu dari H-12 Bulan hingga Hari Bahagia.", max_col=10)

    # KPI Cards on Checklist
    create_kpi_card(ws4, start_row=5, start_col=2, width_cols=2, label="TOTAL TUGAS", value_formula="=COUNTA(D11:D55)", format_str=NUMBER_FORMAT)
    create_kpi_card(ws4, start_row=5, start_col=4, width_cols=2, label="TUGAS SELESAI", value_formula='=COUNTIF(I11:I55, "Selesai")', format_str=NUMBER_FORMAT)
    create_kpi_card(ws4, start_row=5, start_col=6, width_cols=2, label="DALAM PROSES", value_formula='=COUNTIF(I11:I55, "Dalam Proses")', format_str=NUMBER_FORMAT)
    create_kpi_card(ws4, start_row=5, start_col=8, width_cols=1, label="BELUM MULAI", value_formula='=COUNTIF(I11:I55, "Belum Mulai")', format_str=NUMBER_FORMAT)
    create_kpi_card(ws4, start_row=5, start_col=9, width_cols=2, label="PROGRESS KELENGKAPAN", value_formula="=D6/B6", format_str=PERCENT_FORMAT)

    checklist_headers = ["✓", "NO", "TASK / KEGIATAN", "FASE WAKTU", "KATEGORI", "PRIORITAS", "TARGET DEADLINE", "STATUS", "CATATAN & PIC"]
    for col_idx, h_text in enumerate(checklist_headers, start=2):
        cell = ws4.cell(row=10, column=col_idx, value=h_text)
        cell.font = font_header_white
        cell.fill = fill_plum
        cell.alignment = align_center if col_idx in [2, 3, 5, 7, 8, 9] else align_left
        cell.border = header_border
    ws4.row_dimensions[10].height = 26

    checklist_tasks = [
        # 12-9 Bulan
        ("Diskusi awal keluarga besar dan penentuan tanggal pernikahan", "12–9 Bulan", "Umum", "Tinggi", "12 Nov 2025", "Selesai", "Tanggal disepakati 12 Oktober 2026"),
        ("Menentukan total anggaran maksimal & komitmen pembagian budget", "12–9 Bulan", "Budget", "Tinggi", "20 Nov 2025", "Selesai", "Alokasi budget Rp120 Juta"),
        ("Menentukan konsep pernikahan (Tradisional Modern / Intimate)", "12–9 Bulan", "Konsep", "Sedang", "01 Des 2025", "Selesai", "Tema romantic plum floral"),
        ("Survey dan booking venue akad & resepsi (Grand Harmony)", "12–9 Bulan", "Venue", "Tinggi", "15 Des 2025", "Selesai", "DP ballroom telah disetor"),
        ("Menyusun estimasi kasar jumlah tamu undangan kedua belah pihak", "12–9 Bulan", "Tamu", "Tinggi", "05 Jan 2026", "Selesai", "Target 250 undangan / 500 pax"),

        # 8-6 Bulan
        ("Survey dan pemilihan vendor catering (Test food menu utama)", "8–6 Bulan", "Catering", "Tinggi", "15 Feb 2026", "Selesai", "Sari Rasa Catering dipilih"),
        ("Survey dan booking vendor dekorasi pelaminan & photobooth", "8–6 Bulan", "Dekorasi", "Tinggi", "28 Feb 2026", "Selesai", "Bloom & Co. Atelier"),
        ("Booking MUA pengantin, keluarga, dan busana pernikahan", "8–6 Bulan", "MUA & Busana", "Tinggi", "15 Mar 2026", "Selesai", "Nadia Beauty & Sanggar Ayu"),
        ("Booking tim dokumentasi foto & cinematic video", "8–6 Bulan", "Dokumentasi", "Tinggi", "30 Mar 2026", "Selesai", "Lensa Kita Photography"),
        ("Sesi foto pre-wedding outdoor & pemilihan foto terbaik", "8–6 Bulan", "Dokumentasi", "Sedang", "15 Apr 2026", "Selesai", "Foto di Kebun Raya Bogor sukses"),
        ("Menentukan pengiring pengantin (Bridesmaid & Groomsmen)", "8–6 Bulan", "Panitia", "Rendah", "30 Apr 2026", "Selesai", "6 sahabat dekat CPW & CPP"),

        # 5-3 Bulan
        ("Desain & cetak sampel undangan fisik hardcover", "5–3 Bulan", "Undangan", "Sedang", "15 Mei 2026", "Selesai", "Sample foil disetujui"),
        ("Pembuatan website undangan digital & RSVP form online", "5–3 Bulan", "Undangan", "Sedang", "30 Mei 2026", "Selesai", "Domain rinaarif.com siap"),
        ("Membeli dan mengumpulkan barang seserahan kotak 1-4", "5–3 Bulan", "Seserahan", "Tinggi", "15 Jun 2026", "Selesai", "Ibadah, skincare & pakaian siap"),
        ("Booking wedding organizer (WO) & tim pendukung Hari H", "5–3 Bulan", "WO", "Tinggi", "30 Jun 2026", "Selesai", "Amanah WO 6 crew onsite"),
        ("Fitting pertama busana pengantin & orang tua kedua pihak", "5–3 Bulan", "Busana", "Tinggi", "10 Jul 2026", "Selesai", "Penyesuaian ukuran kebaya"),
        ("Memilih souvenir pernikahan & memesan kemasan custom", "5–3 Bulan", "Souvenir", "Sedang", "20 Jul 2026", "Selesai", "Pouch cutlery set diproduksi"),
        ("Pemesanan cincin kawin emas & ukir grafir nama", "5–3 Bulan", "Mahar", "Tinggi", "30 Jul 2026", "Selesai", "Spilla Jewelry rose gold"),
        ("Booking hiburan musik akustik & Master of Ceremony (MC)", "5–3 Bulan", "Entertainment", "Sedang", "05 Agu 2026", "Selesai", "Nada Harmoni & Mas Dimas MC"),

        # 2-1 Bulan
        ("Membeli kelengkapan seserahan kotak 5-8 & pesan jasa hias", "2–1 Bulan", "Seserahan", "Tinggi", "15 Agu 2026", "Dalam Proses", "Kotak makeup & bodycare dipacking"),
        ("Mengurus surat pengantar RT/RW dan formulir N1-N4 Kelurahan", "2–1 Bulan", "Administrasi", "Tinggi", "20 Agu 2026", "Dalam Proses", "Berkas CPW selesai, CPP on process"),
        ("Pemeriksaan kesehatan pranikah & imunisasi TT di Puskesmas", "2–1 Bulan", "Administrasi", "Tinggi", "25 Agu 2026", "Dalam Proses", "Sertifikat Elsimil dalam proses"),
        ("Pendaftaran online kehendak nikah di SIMKAH Kemenag", "2–1 Bulan", "Administrasi", "Tinggi", "01 Sep 2026", "Dalam Proses", "Bayar billing PNBP bedol"),
        ("Finalisasi data guest list & penomoran amplop undangan fisik", "2–1 Bulan", "Tamu", "Tinggi", "05 Sep 2026", "Dalam Proses", "55 nama inti telah diinput"),
        ("Distribusi undangan fisik ke keluarga besar & relasi VIP", "2–1 Bulan", "Undangan", "Tinggi", "10 Sep 2026", "Dalam Proses", "Kurir & pengantaran bertahap"),
        ("Broadcast website undangan digital via WhatsApp", "2–1 Bulan", "Undangan", "Sedang", "15 Sep 2026", "Dalam Proses", "Blast gelombang 1 dimulai"),
        ("Meeting teknis keluarga (pembagian seragam & konsumsi)", "2–1 Bulan", "Keluarga", "Sedang", "20 Sep 2026", "Belum Mulai", "Diagendakan akhir pekan"),
        ("Fitting kedua / final busana pengantin & orang tua", "2–1 Bulan", "Busana", "Tinggi", "25 Sep 2026", "Belum Mulai", "Memastikan kenyamanan saat duduk"),

        # H-30
        ("Technical meeting (TM) seluruh vendor di venue acara", "H-30", "Vendor", "Tinggi", "12 Sep 2026", "Dalam Proses", "Koordinasi layout & kelistrikan"),
        ("Penyusunan rundown detail acara akad & resepsi bersama WO", "H-30", "WO", "Tinggi", "15 Sep 2026", "Dalam Proses", "Draft v2 telah dibagikan"),
        ("Konfirmasi final menu & jumlah porsi dengan vendor catering", "H-30", "Catering", "Tinggi", "20 Sep 2026", "Belum Mulai", "Menyesuaikan angka RSVP sementara"),
        ("Cek progress pembuatan frame mahar dan jasa hias seserahan", "H-30", "Seserahan", "Sedang", "25 Sep 2026", "Dalam Proses", "Kotak akrilik mulai dihias"),
        ("Mengikuti Bimbingan Perkawinan (Bimwin) mandiri / KUA", "H-30", "Administrasi", "Tinggi", "28 Sep 2026", "Belum Mulai", "Jadwal KUA kecamatan"),

        # H-14
        ("Follow up RSVP tamu undangan & rekap kepastian hadir", "H-14", "Tamu", "Tinggi", "28 Sep 2026", "Belum Mulai", "Update sheet 07 — GUEST LIST"),
        ("Pelunasan termin pembayaran seluruh vendor sesuai kontrak", "H-14", "Budget", "Tinggi", "01 Okt 2026", "Belum Mulai", "Pantau sheet 06 — VENDOR"),
        ("Pengambilan frame mahar dan seluruh kotak seserahan hias", "H-14", "Seserahan", "Sedang", "03 Okt 2026", "Belum Mulai", "Disimpan di ruangan aman ber-AC"),
        ("Perawatan spa pra-nikah, facial, lulur & relaksasi tubuh", "H-14", "Pribadi", "Rendah", "05 Okt 2026", "Belum Mulai", "Self care calon pengantin"),

        # H-7
        ("Konfirmasi final seluruh vendor H-7 (PIC, jam tiba, armada)", "H-7", "Vendor", "Tinggi", "05 Okt 2026", "Belum Mulai", "Dipimpin oleh Koordinator WO"),
        ("Gladi resik akad nikah & pembacaan ijab qobul", "H-7", "Acara", "Tinggi", "07 Okt 2026", "Belum Mulai", "Bersama wali & saksi nikah"),
        ("Menyiapkan amplop tips untuk petugas keamanan, kebersihan & driver", "H-7", "Keuangan", "Sedang", "09 Okt 2026", "Belum Mulai", "Diserahkan ke bendahara keluarga"),
        ("Packing busana, perhiasan, sepatu, dan aksesoris ke dalam koper", "H-7", "Logistik", "Tinggi", "10 Okt 2026", "Belum Mulai", "Label koper CPW & CPP jelas"),

        # H-1
        ("Check-in kamar hotel persiapan pengantin & keluarga", "H-1", "Hotel", "Tinggi", "11 Okt 2026", "Belum Mulai", "Kamar 302 & 304 Grand Harmony"),
        ("Loading vendor dekorasi, audio, dan lighting di venue", "H-1", "Venue", "Tinggi", "11 Okt 2026", "Belum Mulai", "Mulai jam 20.00 WIB"),
        ("Istirahat cukup, hindari makanan berminyak, tidur lebih awal", "H-1", "Pribadi", "Tinggi", "11 Okt 2026", "Belum Mulai", "Kondisi tubuh prima untuk Hari H"),

        # Hari H
        ("MUA mulai merias pengantin & keluarga (Jam 04.30 WIB)", "Hari H", "MUA", "Tinggi", "12 Okt 2026", "Belum Mulai", "Sesuai jadwal Nadia Beauty"),
        ("Pelaksanaan prosesi Akad Nikah sakral (Jam 08.00 WIB)", "Hari H", "Acara", "Tinggi", "12 Okt 2026", "Belum Mulai", "Dipandu penghulu KUA & WO"),
        ("Pelaksanaan Resepsi Pernikahan penuh bahagia (Jam 11.00 WIB)", "Hari H", "Acara", "Tinggi", "12 Okt 2026", "Belum Mulai", "Menyambut keluarga dan sahabat")
    ]

    for idx, task in enumerate(checklist_tasks, start=11):
        status_val = task[5]
        check_symbol = "✓" if status_val == "Selesai" else ("⏳" if status_val == "Dalam Proses" else "⬜")
        
        c_chk = ws4.cell(row=idx, column=2, value=check_symbol)
        c_chk.alignment = align_center
        c_chk.font = font_body_bold

        ws4.cell(row=idx, column=3, value=idx-10).alignment = align_center # NO
        ws4.cell(row=idx, column=4, value=task[0]).alignment = align_left # TASK
        ws4.cell(row=idx, column=5, value=task[1]).alignment = align_center # FASE
        ws4.cell(row=idx, column=6, value=task[2]).alignment = align_center # KATEGORI
        
        c_prio = ws4.cell(row=idx, column=7, value=task[3]) # PRIORITAS
        c_prio.alignment = align_center
        c_prio.font = font_body_bold

        ws4.cell(row=idx, column=8, value=task[4]).alignment = align_center # DEADLINE
        
        c_stat = ws4.cell(row=idx, column=9, value=task[5]) # STATUS
        c_stat.alignment = align_center
        c_stat.font = font_body_bold

        ws4.cell(row=idx, column=10, value=task[6]).alignment = align_left # CATATAN

        ws4.row_dimensions[idx].height = 20
        for c in range(2, 11):
            cell = ws4.cell(row=idx, column=c)
            if c not in [2, 7, 9]: cell.font = font_body
            cell.border = thin_border
            if status_val == "Selesai":
                cell.fill = fill_soft_mint
            elif status_val == "Dalam Proses":
                cell.fill = fill_lavender
            elif (idx - 11) % 2 == 1:
                cell.fill = fill_light_pink

    # Dropdowns for Checklist
    dv_status_chk = DataValidation(type="list", formula1='"Belum Mulai,Dalam Proses,Selesai"', allow_blank=True)
    ws4.add_data_validation(dv_status_chk)
    dv_status_chk.add("I11:I55")

    dv_prio_chk = DataValidation(type="list", formula1='"Tinggi,Sedang,Rendah"', allow_blank=True)
    ws4.add_data_validation(dv_prio_chk)
    dv_prio_chk.add("G11:G55")

    # Column widths for Sheet 4
    ws4_col_widths = {2: 5, 3: 6, 4: 42, 5: 14, 6: 15, 7: 13, 8: 15, 9: 16, 10: 38}
    for col_idx, width in ws4_col_widths.items():
        ws4.column_dimensions[get_column_letter(col_idx)].width = width
    ws4.column_dimensions["A"].width = 3
    ws4.freeze_panes = "E11"

    # =========================================================================
    # SHEET 5: 05 — TIMELINE
    # =========================================================================
    ws5 = wb.create_sheet(title="05 — TIMELINE")
    ws5.views.sheetView[0].showGridLines = True
    create_banner(ws5, "TIMELINE & ROADMAP PERNIKAHAN", "Pemetaan tonggak pencapaian (milestone) dan jadwal persiapan terpadu.", max_col=10)

    # Top Milestone Cards (6 Phases)
    milestone_phases = [
        ("FASE 1", "H-12 s/d H-9 Bulan", "Fondasi & Anggaran", "Penentuan tanggal, komitmen budget, booking venue akad & ballroom."),
        ("FASE 2", "H-8 s/d H-6 Bulan", "Core Vendors", "Test food catering, booking dekorasi, MUA, dokumentasi, foto prewed."),
        ("FASE 3", "H-5 s/d H-3 Bulan", "Desain & Busana", "Cetak undangan, booking WO, fitting busana, cicil seserahan & cincin."),
        ("FASE 4", "H-2 s/d H-1 Bulan", "Administrasi & Tamu", "Berkas KUA SIMKAH, sebar undangan, packing seserahan, rundown."),
        ("FASE 5", "H-14 s/d H-1", "Final Countdown", "Pelunasan vendor, TM vendor, gladi resik, check-in hotel persiapan."),
        ("FASE 6", "HARI H", "The Big Day", "Akad nikah khidmat, resepsi bahagia, dokumentasi kenangan abadi.")
    ]

    for idx, (p_num, p_time, p_title, p_desc) in enumerate(milestone_phases):
        c_start = 2 + (idx % 3) * 3
        r_start = 5 if idx < 3 else 9

        ws5.merge_cells(start_row=r_start, start_column=c_start, end_row=r_start, end_column=c_start+2)
        h_cell = ws5.cell(row=r_start, column=c_start, value=f"{p_num}  •  {p_time}")
        h_cell.font = font_kpi_label
        h_cell.fill = fill_plum
        h_cell.alignment = align_center

        ws5.merge_cells(start_row=r_start+1, start_column=c_start, end_row=r_start+1, end_column=c_start+2)
        t_cell = ws5.cell(row=r_start+1, column=c_start, value=p_title)
        t_cell.font = font_body_bold
        t_cell.fill = fill_soft_pink
        t_cell.alignment = align_center

        ws5.merge_cells(start_row=r_start+2, start_column=c_start, end_row=r_start+2, end_column=c_start+2)
        d_cell = ws5.cell(row=r_start+2, column=c_start, value=p_desc)
        d_cell.font = Font(name=font_family, size=8.5, color=C_TEXT)
        d_cell.fill = fill_light_pink
        d_cell.alignment = align_wrap_left

        card_side = Side(border_style="thin", color=C_BORDER_PLUM)
        for r in range(r_start, r_start+3):
            for c in range(c_start, c_start+3):
                lb = card_side if c == c_start else None
                rb = card_side if c == c_start+2 else None
                tb = card_side if r == r_start else None
                bb = card_side if r == r_start+2 else None
                ws5.cell(row=r, column=c).border = Border(left=lb, right=rb, top=tb, bottom=bb)
        ws5.row_dimensions[r_start].height = 20
        ws5.row_dimensions[r_start+1].height = 20
        ws5.row_dimensions[r_start+2].height = 36

    # Detailed Schedule Table
    ws5.merge_cells("B13:J13")
    sch_title = ws5.cell(row=13, column=2, value="📅  JADWAL MASTER PERSIAPAN & PENANGGUNG JAWAB (PIC)")
    sch_title.font = font_section
    sch_title.fill = fill_soft_pink
    sch_title.alignment = Alignment(horizontal="left", vertical="center", indent=1)
    ws5.row_dimensions[13].height = 26
    for c in range(2, 11):
        ws5.cell(row=13, column=c).fill = fill_soft_pink
        ws5.cell(row=13, column=c).border = thin_border

    timeline_headers = ["NO", "TAHAPAN WAKTU", "AGENDA UTAMA", "DEADLINE", "PIC UTAMA", "STATUS", "CATATAN KOORDINASI"]
    ws5.cell(row=14, column=2, value="NO").alignment = align_center
    ws5.cell(row=14, column=3, value="TAHAPAN WAKTU").alignment = align_center
    ws5.cell(row=14, column=4, value="AGENDA & TARGET EKSEKUSI").alignment = align_left
    ws5.merge_cells("D14:E14")
    ws5.cell(row=14, column=6, value="DEADLINE").alignment = align_center
    ws5.cell(row=14, column=7, value="PIC UTAMA").alignment = align_center
    ws5.cell(row=14, column=8, value="STATUS").alignment = align_center
    ws5.cell(row=14, column=9, value="CATATAN KOORDINASI").alignment = align_left
    ws5.merge_cells("I14:J14")

    for c in range(2, 11):
        cell = ws5.cell(row=14, column=c)
        cell.font = font_header_white
        cell.fill = fill_plum
        cell.border = header_border
    ws5.row_dimensions[14].height = 24

    timeline_schedules = [
        ("H-12 Bulan", "Pertemuan kedua keluarga, penentuan tanggal, alokasi budget", "15 Nov 2025", "Kedua Calon & Ortu", "Selesai", "Disepakati tanggal 12 Okt 2026"),
        ("H-11 Bulan", "Survey venue ballroom Jakarta Selatan & ketersediaan tanggal", "15 Des 2025", "Arif & Rina", "Selesai", "Grand Harmony Ballroom di-booking"),
        ("H-9 Bulan", "Test food catering keluarga & survey paket rekanan", "15 Feb 2026", "Ibu Rina & Arif", "Selesai", "Sari Rasa 500 pax dipilih"),
        ("H-8 Bulan", "Booking dekorasi pelaminan modern floral & dokumentasi foto", "15 Mar 2026", "Rina", "Selesai", "Bloom & Co. & Lensa Kita"),
        ("H-7 Bulan", "Booking MUA pengantin, busana akad, dan seragam keluarga", "15 Apr 2026", "Rina & Ibu", "Selesai", "Nadia Beauty & Sanggar Ayu"),
        ("H-6 Bulan", "Sesi foto prewedding di Kebun Raya Bogor", "15 Mei 2026", "Arif & Rina", "Selesai", "Teaser prewed siap"),
        ("H-5 Bulan", "Finalisasi desain undangan fisik, digital, dan souvenir", "15 Jun 2026", "Arif", "Selesai", "Undangan dicetak 100 pcs"),
        ("H-4 Bulan", "Booking Wedding Organizer (WO) & cicil belanja seserahan", "15 Jul 2026", "Arif & Rina", "Selesai", "Amanah WO siap berkolaborasi"),
        ("H-3 Bulan", "Fitting pertama busana pengantin & beli cincin kawin", "15 Agu 2026", "Rina & Arif", "Selesai", "Spilla Jewelry rose gold"),
        ("H-2 Bulan", "Pengurusan surat RT/RW, Kelurahan N1-N4 & Puskesmas", "10 Sep 2026", "Arif & Ayah Rina", "Dalam Proses", "Surat rekomendasi nikah diurus"),
        ("H-1 Bulan", "Distribusi undangan fisik & broadcast website undangan", "20 Sep 2026", "Keluarga Besar", "Dalam Proses", "Distribusi berjalan 70%"),
        ("H-30", "Technical Meeting seluruh vendor & tim WO di venue", "12 Sep 2026", "WO & Tim Vendor", "Dalam Proses", "Rundown v2 diselaraskan"),
        ("H-14", "Rekap final RSVP tamu undangan & pelunasan seluruh vendor", "28 Sep 2026", "Arif & Rina", "Belum Mulai", "Katering disesuaikan RSVP"),
        ("H-7", "Gladi resik akad nikah, serah terima berkas KUA, packing koper", "05 Okt 2026", "Seluruh Panitia", "Belum Mulai", "Memastikan mental & fisik prima"),
        ("H-1", "Loading vendor dekorasi, check in hotel, briefing akhir WO", "11 Okt 2026", "WO & Keluarga", "Belum Mulai", "Istirahat cukup jam 21.00"),
        ("Hari H", "Akad Nikah Khidmat (08.00) & Resepsi Pernikahan (11.00)", "12 Okt 2026", "Seluruh Pihak", "Belum Mulai", "Puncak hari bahagia")
    ]

    for idx, row_item in enumerate(timeline_schedules, start=15):
        ws5.cell(row=idx, column=2, value=idx-14).alignment = align_center
        ws5.cell(row=idx, column=3, value=row_item[0]).alignment = align_center # Tahapan
        ws5.cell(row=idx, column=4, value=row_item[1]).alignment = align_left # Agenda
        ws5.merge_cells(start_row=idx, start_column=4, end_row=idx, end_column=5)
        ws5.cell(row=idx, column=6, value=row_item[2]).alignment = align_center # Deadline
        ws5.cell(row=idx, column=7, value=row_item[3]).alignment = align_center # PIC
        
        c_st = ws5.cell(row=idx, column=8, value=row_item[4]) # Status
        c_st.alignment = align_center
        c_st.font = font_body_bold

        ws5.cell(row=idx, column=9, value=row_item[5]).alignment = align_left # Catatan
        ws5.merge_cells(start_row=idx, start_column=9, end_row=idx, end_column=10)

        ws5.row_dimensions[idx].height = 20
        for c in range(2, 11):
            cell = ws5.cell(row=idx, column=c)
            if c != 8: cell.font = font_body
            cell.border = thin_border
            if row_item[4] == "Selesai":
                cell.fill = fill_soft_mint
            elif row_item[4] == "Dalam Proses":
                cell.fill = fill_lavender
            elif (idx - 15) % 2 == 1:
                cell.fill = fill_light_pink

    ws5_col_widths = {2: 6, 3: 15, 4: 25, 5: 25, 6: 15, 7: 20, 8: 16, 9: 25, 10: 25}
    for col_idx, width in ws5_col_widths.items():
        ws5.column_dimensions[get_column_letter(col_idx)].width = width
    ws5.column_dimensions["A"].width = 3
    ws5.freeze_panes = "D15"

    # =========================================================================
    # SHEET 6: 06 — VENDOR
    # =========================================================================
    ws6 = wb.create_sheet(title="06 — VENDOR")
    ws6.views.sheetView[0].showGridLines = True
    create_banner(ws6, "VENDOR DIRECTORY & PAYMENT TRACKER", "Daftar kontak vendor rekanan, nilai kontrak, termin DP, dan jadwal pelunasan.", max_col=12)

    create_kpi_card(ws6, start_row=5, start_col=2, width_cols=2, label="TOTAL KONTRAK VENDOR", value_formula="=SUM(G11:G26)")
    create_kpi_card(ws6, start_row=5, start_col=4, width_cols=2, label="TOTAL DP TERBAYAR", value_formula="=SUM(H11:H26)")
    create_kpi_card(ws6, start_row=5, start_col=6, width_cols=2, label="SISA TAGIHAN PELUNASAN", value_formula="=SUM(I11:I26)")
    create_kpi_card(ws6, start_row=5, start_col=8, width_cols=2, label="VENDOR SUDAH LUNAS", value_formula='=COUNTIF(K11:K26, "Lunas")', format_str=NUMBER_FORMAT)
    create_kpi_card(ws6, start_row=5, start_col=10, width_cols=3, label="PROGRESS PELUNASAN", value_formula="=D6/B6", format_str=PERCENT_FORMAT)

    vendor_headers = ["NO", "NAMA VENDOR", "KATEGORI", "KONTAK / PIC", "INSTAGRAM", "NILAI KONTRAK", "DP DIBAYAR", "SISA PELUNASAN", "DEADLINE PELUNASAN", "STATUS BAYAR", "CATATAN / BENEFIT"]
    for col_idx, h_text in enumerate(vendor_headers, start=2):
        cell = ws6.cell(row=10, column=col_idx, value=h_text)
        cell.font = font_header_white
        cell.fill = fill_plum
        cell.alignment = align_center if col_idx in [2, 4, 10, 11] else (align_right if col_idx in [7, 8, 9] else align_left)
        cell.border = header_border
    ws6.row_dimensions[10].height = 26

    vendor_items = [
        ("Grand Harmony Ballroom", "Venue", "Pak Gunawan (0812-3456-7890)", "@grandharmony_ballroom", 17500000, 10000000, "28 Sep 2026", "Booked", "Include AC central, soundsystem gedung, 2 ruang rias VIP"),
        ("Sari Rasa Catering", "Catering", "Ibu Dewi (0813-8888-1234)", "@sarirasa_catering", 44200000, 21500000, "28 Sep 2026", "Booked", "Paket buffet 500 pax + 3 food stall favorit + bonus 50 porsi"),
        ("Bloom & Co. Atelier", "Dekorasi", "Mba Clara (0811-9988-7766)", "@bloomandco_wedding", 13300000, 7500000, "28 Sep 2026", "Booked", "Pelaminan 8 meter fresh flowers, photobooth, karpet rose petal"),
        ("Nadia Beauty MUA", "MUA", "Nadia Safira (0856-7788-9900)", "@nadiabeauty_mua", 5600000, 3000000, "01 Okt 2026", "Booked", "Rias pengantin akad & resepsi + retouch + rias ibu & pagar ayu"),
        ("Sanggar Rias Ayu", "Busana", "Ibu Ayu (0815-4433-2211)", "@sanggarayu_kebaya", 5600000, 3200000, "01 Okt 2026", "Booked", "2 pasang baju pengantin + beskap bapak & kebaya ibu 4 stel"),
        ("Lensa Kita Photography", "Dokumentasi", "Mas Fajar (0817-6655-4433)", "@lensakita_photo", 8500000, 6000000, "01 Okt 2026", "Booked", "2 Foto, 1 Video cinematic, teaser 1 min, album kolase 20x30"),
        ("Cerita Kita Undangan", "Undangan", "Admin (0821-3344-5566)", "@ceritakita_invitation", 1600000, 1000000, "25 Sep 2026", "Booked", "Cetak undangan fisik 100 pcs foil emas + kartu ucapan terima kasih"),
        ("KiteInvites Studio", "Undangan Digital", "Mas Bayu (0852-1122-3344)", "@kiteinvites", 400000, 400000, "15 Mei 2026", "Lunas", "Website rinaarif.com + musik latar + RSVP WhatsApp otomatis"),
        ("Manis Kenangan Souvenir", "Souvenir", "Ibu Maya (0878-9900-1122)", "@maniskenangan_souvenir", 3200000, 2000000, "25 Sep 2026", "Booked", "300 cutlery set pouch belacu estetik + sablon inisial"),
        ("Nada Harmoni Acoustic", "Entertainment", "Mas Rangga (0819-2233-4455)", "@nadaharmoni_band", 2200000, 1000000, "05 Okt 2026", "Booked", "Akustik 4 personil + singer profesional"),
        ("Mas Dimas MC", "MC", "Dimas Setiawan (0812-7766-5544)", "@masdimas_mc", 1800000, 1000000, "05 Okt 2026", "Booked", "MC akad & resepsi komunikatif & berpengalaman"),
        ("Thunder Audio Gedung", "Sound System", "Pak Slamet (0813-2211-0099)", "@thunder_audiosystem", 2000000, 1000000, "28 Sep 2026", "Booked", "Sound 5000 watt + 4 wireless mic + operator standby"),
        ("Amanah Wedding Organizer", "Wedding Organizer", "Mba Ratih (0857-4455-6677)", "@amanah_wo", 4000000, 2000000, "05 Okt 2026", "Booked", "6 Crew onsite mengatur alur acara, konsumsi, dan VIP guest"),
        ("Kotak Cinta Seserahan", "Jasa Hias", "Mba Wulan (0818-0011-2233)", "@kotakcinta_hantaran", 1000000, 500000, "20 Sep 2026", "Booked", "Sewa 8 box akrilik mewah + bunga artificial premium"),
        ("Spilla Jewelry", "Cincin Kawin", "Customer Care (0822-8877-6655)", "@spillajewelry", 4200000, 4200000, "30 Jul 2026", "Lunas", "2 Cincin rose gold 18K + grafir laser nama"),
        ("Royal Executive Rent", "Transport", "Pak Harto (0811-3322-1100)", "@royalrent_jakarta", 1600000, 1000000, "05 Okt 2026", "Booked", "Sewa Alphard putih 12 jam include bensin, driver & dekorasi bunga")
    ]

    for idx, v_item in enumerate(vendor_items, start=11):
        ws6.cell(row=idx, column=2, value=idx-10).alignment = align_center # NO
        ws6.cell(row=idx, column=3, value=v_item[0]).alignment = align_left # VENDOR
        ws6.cell(row=idx, column=4, value=v_item[1]).alignment = align_center # KATEGORI
        ws6.cell(row=idx, column=5, value=v_item[2]).alignment = align_left # KONTAK
        ws6.cell(row=idx, column=6, value=v_item[3]).alignment = align_left # INSTAGRAM
        
        c_kontrak = ws6.cell(row=idx, column=7, value=v_item[4]) # NILAI KONTRAK (G)
        c_kontrak.number_format = CURRENCY_FORMAT
        c_kontrak.alignment = align_right

        c_dp = ws6.cell(row=idx, column=8, value=v_item[5]) # DP DIBAYAR (H)
        c_dp.number_format = CURRENCY_FORMAT
        c_dp.alignment = align_right

        c_sisa = ws6.cell(row=idx, column=9, value=f"=G{idx}-H{idx}") # SISA PELUNASAN (I)
        c_sisa.number_format = CURRENCY_FORMAT
        c_sisa.alignment = align_right

        ws6.cell(row=idx, column=10, value=v_item[6]).alignment = align_center # DEADLINE
        
        c_stat = ws6.cell(row=idx, column=11, value=v_item[7]) # STATUS
        c_stat.alignment = align_center
        c_stat.font = font_body_bold

        ws6.cell(row=idx, column=12, value=v_item[8]).alignment = align_left # CATATAN

        ws6.row_dimensions[idx].height = 20
        for c in range(2, 13):
            cell = ws6.cell(row=idx, column=c)
            if c != 11: cell.font = font_body
            cell.border = thin_border
            if v_item[7] == "Lunas":
                cell.fill = fill_soft_mint
            elif (idx - 11) % 2 == 1:
                cell.fill = fill_light_pink

    # Total Row for Vendor
    ws6.merge_cells("B27:F27")
    t_v = ws6.cell(row=27, column=2, value="TOTAL KONTRAK & PEMBAYARAN VENDOR")
    t_v.font = Font(name=font_family, size=10, bold=True, color=C_DARK_PLUM)
    t_v.alignment = Alignment(horizontal="right", vertical="center")
    t_v.fill = fill_soft_pink

    for col_c, col_letter in [(7, "G"), (8, "H"), (9, "I")]:
        c_tot = ws6.cell(row=27, column=col_c, value=f"=SUM({col_letter}11:{col_letter}26)")
        c_tot.font = Font(name=font_family, size=10, bold=True, color=C_DARK_PLUM)
        c_tot.number_format = CURRENCY_FORMAT
        c_tot.alignment = align_right
        c_tot.fill = fill_soft_pink

    for c in range(2, 13):
        ws6.cell(row=27, column=c).fill = fill_soft_pink
        ws6.cell(row=27, column=c).border = total_border
    ws6.row_dimensions[27].height = 24

    # Dropdown for Vendor Status
    dv_status_ven = DataValidation(type="list", formula1='"Survey,Proses,Booked,Lunas"', allow_blank=True)
    ws6.add_data_validation(dv_status_ven)
    dv_status_ven.add("K11:K26")

    ws6_col_widths = {2: 6, 3: 25, 4: 16, 5: 25, 6: 22, 7: 16, 8: 16, 9: 16, 10: 16, 11: 15, 12: 40}
    for col_idx, width in ws6_col_widths.items():
        ws6.column_dimensions[get_column_letter(col_idx)].width = width
    ws6.column_dimensions["A"].width = 3
    ws6.freeze_panes = "D11"

    # =========================================================================
    # SHEET 7: 07 — GUEST LIST (Styled like Screenshot #2)
    # =========================================================================
    ws7 = wb.create_sheet(title="07 — GUEST LIST")
    ws7.views.sheetView[0].showGridLines = True
    create_banner(ws7, "DAFTAR TAMU", "Kelola daftar undangan, klasifikasi hubungan keluarga/rekan, alokasi kursi, dan RSVP.", max_col=10)

    # Top KPI Cards for Guests
    create_kpi_card(ws7, start_row=5, start_col=2, width_cols=2, label="TOTAL UNDANGAN", value_formula="=COUNTA(C11:C65)", format_str=NUMBER_FORMAT)
    create_kpi_card(ws7, start_row=5, start_col=4, width_cols=1, label="TOTAL KURSI", value_formula="=SUM(G11:G65)", format_str=NUMBER_FORMAT)
    create_kpi_card(ws7, start_row=5, start_col=5, width_cols=1, label="SUDAH RSVP", value_formula='=COUNTIF(I11:I65, "Hadir") + COUNTIF(I11:I65, "Tidak Hadir")', format_str=NUMBER_FORMAT)
    create_kpi_card(ws7, start_row=5, start_col=6, width_cols=1, label="KONFIRMASI HADIR", value_formula='=COUNTIF(I11:I65, "Hadir")', format_str=NUMBER_FORMAT)
    create_kpi_card(ws7, start_row=5, start_col=7, width_cols=1, label="BELUM RSVP", value_formula='=COUNTIF(I11:I65, "Belum")', format_str=NUMBER_FORMAT)
    create_kpi_card(ws7, start_row=5, start_col=8, width_cols=1, label="TIDAK HADIR", value_formula='=COUNTIF(I11:I65, "Tidak Hadir")', format_str=NUMBER_FORMAT)
    create_kpi_card(ws7, start_row=5, start_col=9, width_cols=2, label="ESTIMASI KURSI HADIR", value_formula='=SUMIF(I11:I65, "Hadir", G11:G65)', format_str=NUMBER_FORMAT)

    guest_headers = ["NO", "NAMA TAMU", "TAMU DARI", "HUBUNGAN", "JENIS UNDANGAN", "JUMLAH KURSI", "STATUS UNDANGAN", "RSVP", "CATATAN / MEJA"]
    for col_idx, h_text in enumerate(guest_headers, start=2):
        cell = ws7.cell(row=10, column=col_idx, value=h_text)
        cell.font = font_header_white
        cell.fill = fill_plum
        cell.alignment = align_center if col_idx in [2, 4, 5, 6, 7, 8, 9] else align_left
        cell.border = header_border
    ws7.row_dimensions[10].height = 26

    # 55 Realistic Guest Data (Matching Screenshot 2 style)
    guest_data = [
        ("Sasa & Suami", "CPW", "Teman Kerja", "Cetak", 2, "Terkirim", "Hadir", "Rekan divisi HRD"),
        ("Rina", "CPP", "Teman Sekolah", "Digital", 3, "Belum", "Belum", "Sahabat SMA Arif"),
        ("Budi", "CPP", "Teman Kerja", "Cetak", 1, "Terkirim", "Hadir", "Senior Programmer"),
        ("Andi dan keluarga", "CPP", "Keluarga", "Digital", 3, "Terkirim", "Hadir", "Sepupu dari Ibu CPP"),
        ("Sarah", "CPP", "Teman Sekolah", "Cetak", 2, "Terkirim", "Hadir", "Alumni SMP"),
        ("Dika", "CPP", "Teman Sekolah", "Digital", 1, "Belum", "Belum", "Sahabat futsal"),
        ("Fajar", "CPP", "Teman Sekolah", "Digital", 1, "Belum", "Belum", "Teman satu band"),
        ("Tante Ani", "CPW", "Keluarga", "Digital", 2, "Terkirim", "Hadir", "Tante kandung CPW"),
        ("Bu Sari", "CPW", "Teman Kerja", "Cetak", 1, "Belum", "Belum", "Manager Keuangan"),
        ("Pak Hendra", "CPW", "Teman Kerja", "Digital", 2, "Belum", "Belum", "Direktur operasional"),
        ("Raka", "CPP", "Teman Kerja", "Cetak", 3, "Terkirim", "Hadir", "Rekan satu divisi"),
        ("Kak Dini", "CPP", "Teman Sekolah", "Cetak", 1, "Terkirim", "Hadir", "Senior kampus"),
        ("Bu Wati", "CPP", "Keluarga", "Digital", 3, "Terkirim", "Hadir", "Keluarga Semarang"),
        ("Pak Joko", "CPW", "Tetangga", "Digital", 2, "Belum", "Belum", "Ketua RT lingkungan CPW"),
        ("Sinta", "CPW", "Teman Kerja", "Cetak", 1, "Belum", "Belum", "Marketing team"),
        ("Reza", "CPW", "Teman Sekolah", "Digital", 1, "Belum", "Tidak Hadir", "Ada dinas luar kota"),
        ("Nanda", "CPW", "Teman Sekolah", "Digital", 2, "Terkirim", "Hadir", "Teman sebangku SMA"),
        ("Tia", "CPW", "Teman Kuliah", "Digital", 1, "Terkirim", "Hadir", "Teman KKN"),
        ("Deni", "CPP", "Teman Sekolah", "Cetak", 1, "Terkirim", "Hadir", "Sahabat dekat"),
        ("Sarah Lestari", "CPW", "Keluarga", "Cetak", 1, "Terkirim", "Hadir", "Sepupu dekat"),
        ("Dika Pratama", "CPP", "Teman Sekolah", "Digital", 2, "Terkirim", "Hadir", "Teman kampus"),
        ("Fajar Nugraha", "CPP", "Teman Sekolah", "Cetak", 1, "Terkirim", "Hadir", "Groomsman"),
        ("Tante Ani Surabaya", "CPP", "Keluarga", "Digital", 2, "Terkirim", "Hadir", "Rombongan dari Jatim"),
        ("Bu Sari Mulyadi", "CPP", "Keluarga", "Digital", 3, "Terkirim", "Hadir", "Uwak kandung"),
        ("Pak Hendra Jaya", "CPP", "Teman Kerja", "Digital", 1, "Terkirim", "Hadir", "Kolega kantor pusat"),
        ("Raka Ramadhan", "CPP", "Teman Kerja", "Cetak", 3, "Belum", "Belum", "Tamu VIP Kantor"),
        ("Kak Dini Safira", "CPW", "Teman Sekolah", "Digital", 2, "Belum", "Belum", "Bridesmaid"),
        ("Bu Wati Kartika", "CPW", "Teman Sekolah", "Cetak", 1, "Belum", "Belum", "Teman SMA"),
        ("Pak Hendra K.", "CPW", "Keluarga", "Cetak", 1, "Terkirim", "Hadir", "Pakde CPW"),
        ("Raka Aditya", "CPP", "Teman Sekolah", "Digital", 2, "Terkirim", "Hadir", "Teman masa kecil"),
        ("Kak Dini Anggraini", "CPP", "Teman Kerja", "Digital", 1, "Terkirim", "Hadir", "Head of Content"),
        ("Bu Wati Solo", "CPP", "Teman Sekolah", "Cetak", 1, "Terkirim", "Hadir", "Teman SMP"),
        ("Pak Joko Widodo", "CPW", "Keluarga", "Digital", 1, "Terkirim", "Hadir", "Om dari Bandung"),
        ("Sinta Kartika", "CPW", "Teman Kerja", "Digital", 2, "Terkirim", "Hadir", "Bridesmaid"),
        ("Reza Rahadian", "CPW", "Teman Kerja", "Cetak", 1, "Terkirim", "Hadir", "Tim Desain"),
        ("Nanda Putri", "CPW", "Teman Sekolah", "Cetak", 2, "Terkirim", "Hadir", "Sahabat SMA"),
        ("Sasa & Suami", "CPW", "Teman Sekolah", "Cetak", 3, "Terkirim", "Hadir", "Teman kuliah arsitektur"),
        ("Rina Fitriani", "CPW", "Keluarga", "Digital", 1, "Belum", "Belum", "Keluarga Solo"),
        ("Budi Hartono", "CPW", "Teman Sekolah", "Cetak", 3, "Belum", "Belum", "Teman SMA"),
        ("Andi dan keluarga", "CPP", "Teman Kerja", "Digital", 2, "Belum", "Belum", "Lead Engineering"),
        ("Sarah Amalia", "CPP", "Teman Sekolah", "Digital", 1, "Terkirim", "Hadir", "Teman kampus"),
        ("Dika Permana", "CPP", "Teman Sekolah", "Digital", 1, "Terkirim", "Hadir", "Groomsman"),
        ("Fajar Sidik", "CPP", "Keluarga", "Cetak", 1, "Terkirim", "Hadir", "Om kandung"),
        ("Tante Ani Depok", "CPP", "Keluarga", "Digital", 2, "Terkirim", "Hadir", "Keluarga Depok"),
        ("Bu Sari Wardani", "CPP", "Keluarga", "Cetak", 1, "Terkirim", "Hadir", "Bude CPP"),
        ("Pak Hendra Wijaya", "CPW", "Teman Sekolah", "Cetak", 2, "Terkirim", "Hadir", "Rekan bisnis ayah"),
        ("Raka Purnama", "CPW", "Teman Sekolah", "Digital", 1, "Terkirim", "Hadir", "Teman kampus"),
        ("Dimas & Partner", "CPP", "Teman Kuliah", "Digital", 2, "Terkirim", "Hadir", "Teman kos Bandung"),
        ("Maya & Suami", "CPW", "Teman Kuliah", "Digital", 2, "Terkirim", "Hadir", "Teman bimbingan skripsi"),
        ("Kevin Sanjaya", "CPP", "Teman Kerja", "Digital", 1, "Terkirim", "Hadir", "Product Manager"),
        ("Fitri & Keluarga", "CPW", "Tetangga", "Cetak", 3, "Terkirim", "Hadir", "Tetangga samping rumah"),
        ("Aditya Rahman", "CPP", "Teman Sekolah", "Digital", 1, "Terkirim", "Tidak Hadir", "Sedang tugas luar negeri"),
        ("Nadia Paramita", "CPW", "Teman Kerja", "Cetak", 2, "Terkirim", "Hadir", "Rekan HRD"),
        ("Bambang & Istri", "CPP", "Keluarga", "Cetak", 2, "Terkirim", "Hadir", "Paklek CPP"),
        ("dr. Hendro & Istri", "CPW", "Keluarga", "Cetak", 2, "Terkirim", "Hadir", "Dokter keluarga / Om")
    ]

    for idx, g in enumerate(guest_data, start=11):
        ws7.cell(row=idx, column=2, value=idx-10).alignment = align_center
        ws7.cell(row=idx, column=3, value=g[0]).alignment = align_left # NAMA
        
        # TAMU DARI (Pill styling: CPW = soft rose pill, CPP = soft lavender pill)
        c_dari = ws7.cell(row=idx, column=4, value=g[1])
        c_dari.alignment = align_center
        c_dari.font = Font(name=font_family, size=9, bold=True, color=C_DARK_PLUM if g[1]=="CPW" else C_PURPLE_TEXT)
        c_dari.fill = PatternFill(start_color="FCE4EC" if g[1]=="CPW" else "EDE7F6", fill_type="solid")

        # HUBUNGAN
        c_hub = ws7.cell(row=idx, column=5, value=g[2])
        c_hub.alignment = align_center
        c_hub.font = font_body
        if g[2] == "Keluarga":
            c_hub.fill = PatternFill(start_color="FCE4EC", fill_type="solid")
        elif g[2] == "Teman Kerja":
            c_hub.fill = PatternFill(start_color="EDE7F6", fill_type="solid")
        elif g[2] == "Teman Sekolah":
            c_hub.fill = PatternFill(start_color=C_PILL_YELLOW, fill_type="solid")
        elif g[2] == "Teman Kuliah":
            c_hub.fill = PatternFill(start_color="E0F2F1", fill_type="solid")
        else:
            c_hub.fill = PatternFill(start_color=C_PILL_GRAY, fill_type="solid")

        # JENIS UNDANGAN (Cetak = Plum pill, Digital = Lavender pill)
        c_jenis = ws7.cell(row=idx, column=6, value=g[3])
        c_jenis.alignment = align_center
        c_jenis.font = font_body
        c_jenis.fill = PatternFill(start_color="E1D5E7" if g[3]=="Cetak" else "D5E8D4", fill_type="solid")

        # JUMLAH KURSI
        c_kursi = ws7.cell(row=idx, column=7, value=g[4])
        c_kursi.alignment = align_center
        c_kursi.font = font_body_bold

        # STATUS UNDANGAN (Terkirim = Soft Mint, Belum = Soft Light Pink)
        c_st_und = ws7.cell(row=idx, column=8, value=g[5])
        c_st_und.alignment = align_center
        c_st_und.font = font_body
        c_st_und.fill = fill_soft_mint if g[5]=="Terkirim" else fill_light_pink

        # RSVP (Hadir = Mint, Belum = Yellow, Tidak Hadir = Rose)
        c_rsvp = ws7.cell(row=idx, column=9, value=g[6])
        c_rsvp.alignment = align_center
        c_rsvp.font = font_body_bold
        if g[6] == "Hadir":
            c_rsvp.fill = fill_soft_mint
            c_rsvp.font = Font(name=font_family, size=9, bold=True, color=C_MINT_TEXT)
        elif g[6] == "Belum":
            c_rsvp.fill = PatternFill(start_color=C_PILL_YELLOW, fill_type="solid")
            c_rsvp.font = Font(name=font_family, size=9, bold=True, color=C_YELLOW_TEXT)
        else:
            c_rsvp.fill = PatternFill(start_color="F8D7DA", fill_type="solid")
            c_rsvp.font = Font(name=font_family, size=9, bold=True, color=C_ROSE_TEXT)

        # CATATAN
        c_cat = ws7.cell(row=idx, column=10, value=g[7])
        c_cat.alignment = align_left
        c_cat.font = font_body

        ws7.row_dimensions[idx].height = 20
        for c in range(2, 11):
            cell = ws7.cell(row=idx, column=c)
            cell.border = thin_border

    # Dropdowns for Guests
    dv_tamu_dari = DataValidation(type="list", formula1='"CPW,CPP"', allow_blank=True)
    ws7.add_data_validation(dv_tamu_dari)
    dv_tamu_dari.add("D11:D65")

    dv_hubungan = DataValidation(type="list", formula1='"Keluarga,Teman Kerja,Teman Sekolah,Teman Kuliah,Tetangga,Lainnya"', allow_blank=True)
    ws7.add_data_validation(dv_hubungan)
    dv_hubungan.add("E11:E65")

    dv_jenis_und = DataValidation(type="list", formula1='"Cetak,Digital"', allow_blank=True)
    ws7.add_data_validation(dv_jenis_und)
    dv_jenis_und.add("F11:F65")

    dv_status_und = DataValidation(type="list", formula1='"Terkirim,Belum"', allow_blank=True)
    ws7.add_data_validation(dv_status_und)
    dv_status_und.add("H11:H65")

    dv_rsvp = DataValidation(type="list", formula1='"Hadir,Belum,Tidak Hadir"', allow_blank=True)
    ws7.add_data_validation(dv_rsvp)
    dv_rsvp.add("I11:I65")

    ws7_col_widths = {2: 6, 3: 26, 4: 15, 5: 18, 6: 16, 7: 15, 8: 18, 9: 16, 10: 30}
    for col_idx, width in ws7_col_widths.items():
        ws7.column_dimensions[get_column_letter(col_idx)].width = width
    ws7.column_dimensions["A"].width = 3
    ws7.freeze_panes = "D11"

    # =========================================================================
    # SHEET 8: 08 — SESERAHAN (Styled like Screenshot #1)
    # =========================================================================
    ws8 = wb.create_sheet(title="08 — SESERAHAN")
    ws8.views.sheetView[0].showGridLines = True
    create_banner(ws8, "LIST SESERAHAN", "Perencanaan dan realisasi 8 kotak seserahan pernikahan impian.", max_col=10)

    # Top KPI Cards for Seserahan
    create_kpi_card(ws8, start_row=5, start_col=2, width_cols=2, label="BUDGET SESERAHAN", value_formula="=SUM(F11:F58)")
    create_kpi_card(ws8, start_row=5, start_col=4, width_cols=2, label="REALISASI SESERAHAN", value_formula="=SUM(G11:G58)")
    create_kpi_card(ws8, start_row=5, start_col=6, width_cols=2, label="SISA BUDGET SESERAHAN", value_formula="=B6-D6")
    create_kpi_card(ws8, start_row=5, start_col=8, width_cols=1, label="TOTAL BARANG", value_formula="=COUNTA(D11:D58)", format_str=NUMBER_FORMAT)
    create_kpi_card(ws8, start_row=5, start_col=9, width_cols=2, label="STATUS SELESAI", value_formula='=COUNTIF(H11:H58, "Done")/B6', format_str=PERCENT_FORMAT)

    seserahan_headers = ["NO", "KATEGORI", "BARANG", "BRAND", "ANGGARAN", "REALISASI", "STATUS", "CATATAN / TOKO"]
    for col_idx, h_text in enumerate(seserahan_headers, start=2):
        cell = ws8.cell(row=10, column=col_idx, value=h_text)
        cell.font = font_header_white
        cell.fill = fill_plum
        cell.alignment = align_center if col_idx in [2, 4, 8] else (align_right if col_idx in [6, 7] else align_left)
        cell.border = header_border
    ws8.row_dimensions[10].height = 26

    # 8 Detailed Categories matching Indonesian Wedding Seserahan (Min 40-50 items)
    seserahan_categories_data = [
        ("1. Perlengkapan Ibadah", [
            ("Al-Qur'an Tajwid Terjemahan A5", "Cordoba Premium", 300000, 280000, "Done", "Cover emboss rose gold"),
            ("Mukena Silk Sutra Bordir", "Tazkia Hijab", 650000, 600000, "Done", "Bahan lembut include sajadah muka"),
            ("Sajadah Tenun Turki Premium", "Lokal Brand", 250000, 250000, "Done", "Warna beige motif kubah"),
            ("Tasbih Mutiara Kristal", "Lokal Handmade", 150000, 120000, "Done", "33 butir kristal cantik")
        ]),
        ("2. Pakaian & Hijab", [
            ("Dress Pesta Silk Satin", "Zara", 850000, 799000, "Done", "Warna dusty rose ukuran M"),
            ("Setelan Gamis Modest", "Hijup", 700000, 650000, "Done", "Bahan flowy elegan"),
            ("Hijab Voal Ultrafine", "Buttonscarves", 425000, 425000, "Done", "Motif Monogram Series"),
            ("Pashmina Silk Ceruty", "Elzatta", 175000, 150000, "Done", "Warna champagne nude"),
            ("Set Baju Tidur Piyama Satin", "Sorex", 250000, 220000, "Done", "Model kimono tidur")
        ]),
        ("3. Skincare Routine", [
            ("Facial Wash Low pH Cleanser", "Skintific", 120000, 99000, "Done", "Gentle cleanser ceramide"),
            ("Hydrating & Soothing Toner", "Skintific", 160000, 135000, "Done", "Centella soothing toner"),
            ("Moisturizer Gel 5X Ceramide", "The Originote", 90000, 75000, "Done", "Lock moisture 24 jam"),
            ("Sunscreen SPF 50+ PA++++", "Azarine", 110000, 89000, "Done", "Hydrasoothe sun gel"),
            ("Brightening Glow Serum", "Avoskin", 170000, 145000, "Done", "Miraculous refining serum")
        ]),
        ("4. Bodycare & Haircare", [
            ("Body Lotion Gluta-Hya Flawless", "Vaseline", 95000, 80000, "Done", "Serum burst UV lotion"),
            ("Goat Milk Shower Body Wash", "The Bath Box", 160000, 145000, "Done", "Aroma almond vanilla"),
            ("Shampoo Extraordinary Oil", "L'Oreal", 140000, 125000, "Done", "Untuk rambut berkilau"),
            ("Conditioner Total Repair 5", "L'Oreal", 150000, 135000, "Done", "Melembutkan rambut"),
            ("Hair Creambath Mask Nutritive", "Makarizo", 110000, 95000, "Done", "Kandungan royal jelly"),
            ("Eau De Parfum 100ml", "HMNS (Orgasm)", 380000, 375000, "Done", "Aroma vanila mawar mewah")
        ]),
        ("5. Makeup & Kosmetik", [
            ("Cushion Copy Paste SPF 35", "Somethinc", 220000, 189000, "Done", "Shade Buttercream medium"),
            ("Loose Powder Silky Smooth", "Make Over", 145000, 125000, "Done", "Matte finish natural"),
            ("Eyeshadow Palette Goddess", "ESQA", 260000, 230000, "Done", "9 warna shimmer & earthy tone"),
            ("Blush On Cheek Souffle", "Rollover Reaction", 140000, 120000, "Done", "Warna peach blush"),
            ("Sky High Waterproof Mascara", "Maybelline", 150000, 135000, "Done", "Melentikkan tahan 24 jam"),
            ("Lip Tint Velvet Mousse", "Dear Me Beauty", 120000, 99000, "Done", "Warna Dear Amanda"),
            ("Setting Spray Lock Makeup", "Studio Tropik", 130000, 115000, "Done", "DreamSetter glowing spray")
        ]),
        ("6. Tas, Sepatu & Aksesoris", [
            ("Quilted Tweed Shoulder Bag", "Charles & Keith", 1200000, 1150000, "Done", "Tas selempang elegan"),
            ("Pointed Toe Flats Shoes", "Pedro", 950000, 899000, "Done", "Warna cream size 38"),
            ("Jam Tangan Petite Rose Gold", "Daniel Wellington", 2200000, 2050000, "Done", "Dial putih mesh strap"),
            ("Dompet Lipat Kulit Mini", "Fossil", 650000, 580000, "Done", "Bahan leather soft rose")
        ]),
        ("7. Elektronik & Styling Tools", [
            ("Hair Dryer Fast Dry Ionic", "Philips", 450000, 399000, "Done", "Teknologi pelindung panas"),
            ("Catokan Pelurus Keratin Therapy", "Remington", 750000, 680000, "Done", "Plat keramik keratin"),
            ("Pembersih Wajah Silikon Sonic", "InFace / Foreo", 280000, 240000, "Done", "Waterproof vibrating brush")
        ]),
        ("8. Paket Bedding & Perlengkapan Kamar", [
            ("Bedcover Set King Size Tencel", "Kintakun Jacquard", 950000, 890000, "Done", "Sprei 180x200 tencel luxury"),
            ("Scented Candle Aromatherapy", "Bath & Body Works", 350000, 300000, "Done", "Aroma Japanese Cherry"),
            ("Bathrobe Couple Waffle Cotton", "Lokal Craft", 300000, 280000, "Done", "Bordir Mr & Mrs")
        ])
    ]

    current_row = 11
    cat_summary_seserahan = []

    for cat_idx, (cat_name, items) in enumerate(seserahan_categories_data, start=1):
        start_cat_row = current_row
        for item_idx, (b_item, b_brand, b_ang, b_real, b_stat, b_note) in enumerate(items):
            ws8.cell(row=current_row, column=2, value=cat_idx if item_idx==0 else "").alignment = align_center
            ws8.cell(row=current_row, column=3, value=cat_name if item_idx==0 else "").alignment = align_left # Kategori
            ws8.cell(row=current_row, column=4, value=b_item).alignment = align_left # Barang
            ws8.cell(row=current_row, column=5, value=b_brand).alignment = align_left # Brand

            c_ang = ws8.cell(row=current_row, column=6, value=b_ang)
            c_ang.number_format = CURRENCY_FORMAT
            c_ang.alignment = align_right

            c_real = ws8.cell(row=current_row, column=7, value=b_real)
            c_real.number_format = CURRENCY_FORMAT
            c_real.alignment = align_right

            c_st = ws8.cell(row=current_row, column=8, value=b_stat)
            c_st.alignment = align_center
            c_st.font = font_body_bold
            c_st.fill = fill_soft_mint if b_stat=="Done" else fill_light_pink

            ws8.cell(row=current_row, column=9, value=b_note).alignment = align_left
            ws8.row_dimensions[current_row].height = 20

            for c in range(2, 10):
                cell = ws8.cell(row=current_row, column=c)
                if c != 8: cell.font = font_body
                cell.border = thin_border

            current_row += 1

        end_cat_row = current_row - 1
        # Subtotal row for category
        ws8.merge_cells(start_row=current_row, start_column=2, end_row=current_row, end_column=5)
        sub_lbl = ws8.cell(row=current_row, column=2, value=f"TOTAL {cat_name.upper()}")
        sub_lbl.font = Font(name=font_family, size=9, bold=True, color=C_DARK_PLUM)
        sub_lbl.alignment = Alignment(horizontal="right", vertical="center")
        sub_lbl.fill = fill_soft_pink

        sub_ang = ws8.cell(row=current_row, column=6, value=f"=SUM(F{start_cat_row}:F{end_cat_row})")
        sub_ang.font = Font(name=font_family, size=9, bold=True, color=C_DARK_PLUM)
        sub_ang.number_format = CURRENCY_FORMAT
        sub_ang.alignment = align_right
        sub_ang.fill = fill_soft_pink

        sub_real = ws8.cell(row=current_row, column=7, value=f"=SUM(G{start_cat_row}:G{end_cat_row})")
        sub_real.font = Font(name=font_family, size=9, bold=True, color=C_DARK_PLUM)
        sub_real.number_format = CURRENCY_FORMAT
        sub_real.alignment = align_right
        sub_real.fill = fill_soft_pink

        cat_summary_seserahan.append((cat_name, current_row))

        ws8.cell(row=current_row, column=8, value="")
        ws8.cell(row=current_row, column=9, value="")
        for c in range(2, 10):
            ws8.cell(row=current_row, column=c).fill = fill_soft_pink
            ws8.cell(row=current_row, column=c).border = thin_border
        ws8.row_dimensions[current_row].height = 22
        current_row += 1

    # Grand Total Row for Seserahan
    grand_row = current_row
    ws8.merge_cells(start_row=grand_row, start_column=2, end_row=grand_row, end_column=5)
    g_lbl = ws8.cell(row=grand_row, column=2, value="TOTAL KESELURUHAN SESERAHAN")
    g_lbl.font = Font(name=font_family, size=10, bold=True, color=C_DARK_PLUM)
    g_lbl.alignment = Alignment(horizontal="right", vertical="center")
    g_lbl.fill = fill_soft_pink

    sub_rows_str_ang = "+".join([f"F{r}" for _, r in cat_summary_seserahan])
    sub_rows_str_real = "+".join([f"G{r}" for _, r in cat_summary_seserahan])

    g_ang = ws8.cell(row=grand_row, column=6, value=f"={sub_rows_str_ang}")
    g_ang.font = Font(name=font_family, size=10, bold=True, color=C_DARK_PLUM)
    g_ang.number_format = CURRENCY_FORMAT
    g_ang.alignment = align_right
    g_ang.fill = fill_soft_pink

    g_real = ws8.cell(row=grand_row, column=7, value=f"={sub_rows_str_real}")
    g_real.font = Font(name=font_family, size=10, bold=True, color=C_DARK_PLUM)
    g_real.number_format = CURRENCY_FORMAT
    g_real.alignment = align_right
    g_real.fill = fill_soft_pink

    for c in range(2, 10):
        ws8.cell(row=grand_row, column=c).fill = fill_soft_pink
        ws8.cell(row=grand_row, column=c).border = total_border
    ws8.row_dimensions[grand_row].height = 24

    # Update top KPI card for Seserahan Budget & Realisasi to reference grand total
    ws8.cell(row=6, column=2, value=f"=F{grand_row}")
    ws8.cell(row=6, column=4, value=f"=G{grand_row}")

    # Dropdown for Seserahan Status
    dv_status_ses = DataValidation(type="list", formula1='"Done,Process,Order,Pending"', allow_blank=True)
    ws8.add_data_validation(dv_status_ses)
    dv_status_ses.add(f"H11:H{grand_row-1}")

    # Summary table for Doughnut Chart in Seserahan (Columns L & M)
    ws8.cell(row=10, column=12, value="KATEGORI SESERAHAN").font = font_header_white
    ws8.cell(row=10, column=12).fill = fill_plum
    ws8.cell(row=10, column=13, value="REALISASI").font = font_header_white
    ws8.cell(row=10, column=13).fill = fill_plum
    for s_idx, (c_name, r_num) in enumerate(cat_summary_seserahan, start=11):
        ws8.cell(row=s_idx, column=12, value=c_name).font = font_body
        ws8.cell(row=s_idx, column=12).border = thin_border
        c_r = ws8.cell(row=s_idx, column=13, value=f"=G{r_num}")
        c_r.font = font_body
        c_r.number_format = CURRENCY_FORMAT
        c_r.border = thin_border
        c_r.alignment = align_right
        ws8.row_dimensions[s_idx].height = 20

    # Seserahan Chart
    pie_ses = DoughnutChart()
    pie_ses.title = "Distribusi Pengeluaran Seserahan"
    pie_ses.style = 10
    pie_ses.height = 11
    pie_ses.width = 16
    labels_ses = Reference(ws8, min_col=12, min_row=11, max_row=10+len(cat_summary_seserahan))
    data_ses = Reference(ws8, min_col=13, min_row=10, max_row=10+len(cat_summary_seserahan))
    pie_ses.add_data(data_ses, titles_from_data=True)
    pie_ses.set_categories(labels_ses)
    ws8.add_chart(pie_ses, "L20")

    ws8_col_widths = {2: 6, 3: 24, 4: 32, 5: 22, 6: 16, 7: 16, 8: 15, 9: 34, 12: 26, 13: 16}
    for col_idx, width in ws8_col_widths.items():
        ws8.column_dimensions[get_column_letter(col_idx)].width = width
    ws8.column_dimensions["A"].width = 3
    ws8.column_dimensions["J"].width = 3
    ws8.column_dimensions["K"].width = 3
    ws8.freeze_panes = "E11"

    # =========================================================================
    # SHEET 9: 09 — ADMINISTRASI (Styled like Screenshot #3)
    # =========================================================================
    ws9 = wb.create_sheet(title="09 — ADMINISTRASI")
    ws9.views.sheetView[0].showGridLines = True
    create_banner(ws9, "ADMINISTRASI PERSIAPAN PERNIKAHAN", "Panduan kelengkapan berkas resmi KUA/Catatan Sipil dan alur birokrasi pendaftaran.", max_col=10)

    # Section 1 Header: Syarat Calon Pengantin (Wanita & Pria)
    ws9.merge_cells("B5:J5")
    adm_title = ws9.cell(row=5, column=2, value="📑  SYARAT DOKUMEN CALON PENGANTIN (WANITA & PRIA)")
    adm_title.font = font_section
    adm_title.fill = fill_soft_pink
    adm_title.alignment = Alignment(horizontal="left", vertical="center", indent=1)
    ws9.row_dimensions[5].height = 28
    for c in range(2, 11):
        ws9.cell(row=5, column=c).fill = fill_soft_pink
        ws9.cell(row=5, column=c).border = thin_border

    adm_headers = ["NO", "SYARAT / DOKUMEN PERSYARATAN", "ESTIMASI BIAYA", "STATUS BERKAS", "CATATAN / KETERANGAN PRAKTIS"]
    ws9.cell(row=6, column=2, value="NO").alignment = align_center
    ws9.cell(row=6, column=3, value="SYARAT / DOKUMEN PERSYARATAN").alignment = align_left
    ws9.merge_cells("C6:E6")
    ws9.cell(row=6, column=6, value="ESTIMASI BIAYA").alignment = align_right
    ws9.cell(row=6, column=7, value="STATUS BERKAS").alignment = align_center
    ws9.cell(row=6, column=8, value="CATATAN / KETERANGAN PRAKTIS").alignment = align_left
    ws9.merge_cells("H6:J6")

    for c in range(2, 11):
        cell = ws9.cell(row=6, column=c)
        cell.font = font_header_white
        cell.fill = fill_plum
        cell.border = header_border
    ws9.row_dimensions[6].height = 24

    # 20 Items matching Screenshot 3 + Indonesian reality
    adm_items = [
        ("Surat pengantar nikah dari RT / RW setempat (CPW & CPP)", 0, "Selesai", "Bawa fotokopi KTP dan KK asli untuk pengantar"),
        ("Surat keterangan nikah dari Kelurahan (Model N1 s/d N4)", 0, "Selesai", "Diurus di kantor kelurahan domisili"),
        ("Fotokopi KTP kedua calon pengantin (masing-masing 4 lembar)", 10000, "Selesai", "Fotokopi jelas tidak buram"),
        ("Fotokopi Kartu Keluarga (KK) kedua calon pengantin", 5000, "Selesai", "Data alamat harus sesuai dengan KTP"),
        ("Fotokopi Akta Kelahiran kedua calon pengantin", 5000, "Selesai", "Untuk verifikasi nama orang tua"),
        ("Fotokopi Ijazah terakhir kedua calon pengantin", 10000, "Selesai", "Menyelaraskan ejaan nama di buku nikah"),
        ("Pas foto 2x3 (4 lbr) & 4x6 (2 lbr) latar belakang warna biru", 150000, "Selesai", "Baju berkerah rapi / jas, cetak doff studio"),
        ("Surat keterangan sehat pranikah dari Puskesmas setempat", 200000, "Selesai", "Cek lab darah, hemoglobin, dan imunisasi TT wanita"),
        ("Persetujuan kedua calon pengantin (Formulir Model N7)", 0, "Selesai", "Ditandatangani kedua belah pihak"),
        ("Fotokopi KTP orang tua / wali nikah (ayah kandung)", 5000, "Selesai", "Jika ayah wafat sertakan surat akta kematian"),
        ("Fotokopi KTP 2 orang saksi nikah", 5000, "Selesai", "Saksi dari pihak keluarga yang sudah dewasa"),
        ("Surat rekomendasi nikah dari KUA asal (Surat Numpang Nikah)", 20000, "Selesai", "Khusus jika akad diadakan di kecamatan berbeda"),
        ("Pendaftaran online kehendak nikah di SIMKAH Kemenag", 0, "Selesai", "Melalui portal simkah.kemenag.go.id"),
        ("Biaya nikah di luar kantor KUA (Bedol / Hari Libur)", 600000, "Selesai", "Setor resmi via kode billing Simponi PNBP ke Bank"),
        ("Materai 10.000 (8 lembar untuk berkas & surat pernyataan)", 80000, "Selesai", "Ditempel pada surat pernyataan & perjanjian"),
        ("Sertifikat Elektronik Siap Nikah & Hamil (Aplikasi ELSIMIL)", 0, "Selesai", "Unduh sertifikat hijau dari BKKBN"),
        ("Buku & Bimbingan Perkawinan (Bimwin) mandiri / KUA", 0, "Dalam Proses", "Wajib diikuti calon pengantin sebelum akad"),
        ("Fotokopi KTP & KK saksi dan wali nikah legalisir", 10000, "Dalam Proses", "Diserahkan ke petugas pencatat nikah"),
        ("Map folder arsip berkas pernikahan tahan air", 25000, "Selesai", "Menyimpan seluruh dokumen asli agar aman"),
        ("Biaya administrasi operasional / transport penghulu KUA", 200000, "Dalam Proses", "Disiapkan amplop rapi oleh panitia keluarga")
    ]

    for idx, (doc_name, doc_cost, doc_stat, doc_note) in enumerate(adm_items, start=7):
        ws9.cell(row=idx, column=2, value=idx-6).alignment = align_center
        ws9.cell(row=idx, column=3, value=doc_name).alignment = align_left
        ws9.merge_cells(start_row=idx, start_column=3, end_row=idx, end_column=5)

        c_cost = ws9.cell(row=idx, column=6, value=doc_cost)
        c_cost.number_format = CURRENCY_FORMAT
        c_cost.alignment = align_right

        c_stat = ws9.cell(row=idx, column=7, value=doc_stat)
        c_stat.alignment = align_center
        c_stat.font = font_body_bold
        c_stat.fill = fill_soft_mint if doc_stat=="Selesai" else fill_lavender

        ws9.cell(row=idx, column=8, value=doc_note).alignment = align_left
        ws9.merge_cells(start_row=idx, start_column=8, end_row=idx, end_column=10)

        ws9.row_dimensions[idx].height = 20
        for c in range(2, 11):
            cell = ws9.cell(row=idx, column=c)
            if c != 7: cell.font = font_body
            cell.border = thin_border
            if (idx - 7) % 2 == 1:
                cell.fill = fill_light_pink

    # Total Row for Administrasi
    ws9.merge_cells("B27:E27")
    t_adm = ws9.cell(row=27, column=2, value="TOTAL BIAYA ADMINISTRASI PERSIAPAN PERNIKAHAN")
    t_adm.font = Font(name=font_family, size=9.5, bold=True, color=C_DARK_PLUM)
    t_adm.alignment = Alignment(horizontal="right", vertical="center")
    t_adm.fill = fill_soft_pink

    c_tot_adm = ws9.cell(row=27, column=6, value="=SUM(F7:F26)")
    c_tot_adm.font = Font(name=font_family, size=10, bold=True, color=C_DARK_PLUM)
    c_tot_adm.number_format = CURRENCY_FORMAT
    c_tot_adm.alignment = align_right
    c_tot_adm.fill = fill_soft_pink

    ws9.cell(row=27, column=7, value="")
    ws9.merge_cells("H27:J27")
    ws9.cell(row=27, column=8, value="")
    for c in range(2, 11):
        ws9.cell(row=27, column=c).fill = fill_soft_pink
        ws9.cell(row=27, column=c).border = total_border
    ws9.row_dimensions[27].height = 24

    # Dropdown for Administrasi Status
    dv_status_adm = DataValidation(type="list", formula1='"Belum,Dalam Proses,Selesai"', allow_blank=True)
    ws9.add_data_validation(dv_status_adm)
    dv_status_adm.add("G7:G26")

    # Section 2 Header: Alur Pendaftaran Pernikahan (Matching Screenshot 3)
    ws9.merge_cells("B30:J30")
    alur_banner = ws9.cell(row=30, column=2, value="🏛️  ALUR PENDAFTARAN PERNIKAHAN RESMI (KUA / CATATAN SIPIL)")
    alur_banner.font = font_section_white
    alur_banner.fill = fill_plum
    alur_banner.alignment = Alignment(horizontal="left", vertical="center", indent=1)
    ws9.row_dimensions[30].height = 28
    for c in range(2, 11):
        ws9.cell(row=30, column=c).fill = fill_plum
        ws9.cell(row=30, column=c).border = thin_border

    alur_steps = [
        ("Langkah 1", "Datang ke Pengurus RT / RW Setempat", "Membawa fotokopi KK dan KTP asli kedua calon untuk mendapatkan Surat Pengantar Nikah resmi dari RT dan RW."),
        ("Langkah 2", "Pemeriksaan Kesehatan di Puskesmas", "Melakukan skrining kesehatan pranikah, cek golongan darah & hemoglobin, imunisasi TT wanita, serta input aplikasi ELSIMIL."),
        ("Langkah 3", "Datang ke Kantor Kelurahan", "Menyerahkan surat pengantar RT/RW untuk menerbitkan Formulir N1 (Surat Nikah), N2 (Asal Usul), dan N4 (Surat Orang Tua)."),
        ("Langkah 4", "Pengurusan Rekomendasi Nikah di KUA Asal", "Khusus bagi calon pengantin pria/wanita yang menikah di luar kecamatan asal, wajib meminta Surat Rekomendasi Nikah (Numpang Nikah)."),
        ("Langkah 5", "Pendaftaran Kehendak Nikah di SIMKAH Online", "Input data calon pengantin di situs simkah.kemenag.go.id, upload berkas, dan bayar tagihan PNBP Rp600.000 ke Bank jika menikah di luar kantor KUA."),
        ("Langkah 6", "Bimbingan Perkawinan & Verifikasi Akhir", "Menghadiri kursus pranikah (Bimwin) dan pemeriksaan berkas fisik di KUA bersama wali nikah minimal H-10 sebelum akad.")
    ]

    for idx, (s_num, s_title, s_desc) in enumerate(alur_steps, start=31):
        ws9.cell(row=idx, column=2, value=s_num).alignment = align_center
        ws9.cell(row=idx, column=2).font = font_body_bold
        ws9.cell(row=idx, column=2).fill = fill_soft_pink

        ws9.cell(row=idx, column=3, value=s_title).alignment = align_left
        ws9.cell(row=idx, column=3).font = font_body_bold
        ws9.merge_cells(start_row=idx, start_column=3, end_row=idx, end_column=5)

        ws9.cell(row=idx, column=6, value=s_desc).alignment = align_wrap_left
        ws9.merge_cells(start_row=idx, start_column=6, end_row=idx, end_column=10)

        ws9.row_dimensions[idx].height = 26
        for c in range(2, 11):
            cell = ws9.cell(row=idx, column=c)
            if c not in [2, 3]: cell.font = font_body
            cell.border = thin_border
            if (idx - 31) % 2 == 1:
                cell.fill = fill_light_pink

    ws9_col_widths = {2: 12, 3: 20, 4: 15, 5: 15, 6: 18, 7: 16, 8: 20, 9: 20, 10: 25}
    for col_idx, width in ws9_col_widths.items():
        ws9.column_dimensions[get_column_letter(col_idx)].width = width
    ws9.column_dimensions["A"].width = 3

    # =========================================================================
    # SHEET 10: 10 — CATATAN
    # =========================================================================
    ws10 = wb.create_sheet(title="10 — CATATAN")
    ws10.views.sheetView[0].showGridLines = True
    create_banner(ws10, "CATATAN & INSPIRASI PERNIKAHAN", "Ruang catatan meeting vendor, ide dekorasi, kontak darurat, dan kesepakatan keluarga.", max_col=10)

    # Note Section A: Hasil Meeting Vendor
    ws10.merge_cells("B5:J5")
    n_a = ws10.cell(row=5, column=2, value="📝  CATATAN MEETING VENDOR & KESEPAKATAN")
    n_a.font = font_section
    n_a.fill = fill_soft_pink
    n_a.alignment = Alignment(horizontal="left", vertical="center", indent=1)
    ws10.row_dimensions[5].height = 26
    for c in range(2, 11):
        ws10.cell(row=5, column=c).fill = fill_soft_pink
        ws10.cell(row=5, column=c).border = thin_border

    notes_vendor = [
        ("Grand Harmony Hotel", "Technical meeting disepakati tanggal 12 September 2026. Ruang rias VIP dapat dipakai mulai jam 04.00 WIB pagi."),
        ("Sari Rasa Catering", "Menu gubukan zuppa soup ditambah 50 porsi gratis sebagai bonus. Pelayanan es puter dimulai setelah prosesi lempar buket."),
        ("Bloom & Co. Dekorasi", "Tone warna pelaminan: terracotta rose, plum burgundy, dan aksen gold. Standing floral di aisle menggunakan mawar putih segar."),
        ("Lensa Kita Photo", "Fotografer standby jam 05.30 WIB untuk liputan prosesi makeup CPW dan detail aksesoris cincin/mahar.")
    ]
    for idx, (v_name, v_note) in enumerate(notes_vendor, start=6):
        ws10.cell(row=idx, column=2, value=v_name).font = font_body_bold
        ws10.cell(row=idx, column=2).alignment = align_left
        ws10.merge_cells(start_row=idx, start_column=2, end_row=idx, end_column=3)

        ws10.cell(row=idx, column=4, value=v_note).font = font_body
        ws10.cell(row=idx, column=4).alignment = align_wrap_left
        ws10.merge_cells(start_row=idx, start_column=4, end_row=idx, end_column=10)

        ws10.row_dimensions[idx].height = 24
        for c in range(2, 11):
            cell = ws10.cell(row=idx, column=c)
            cell.border = thin_border
            if idx % 2 == 1:
                cell.fill = fill_light_pink

    # Note Section B: Susunan Panitia Keluarga & Kontak Darurat
    ws10.merge_cells("B11:J11")
    n_b = ws10.cell(row=11, column=2, value="👥  PANITIA KELUARGA & KONTAK DARURAT HARI H")
    n_b.font = font_section
    n_b.fill = fill_soft_pink
    n_b.alignment = Alignment(horizontal="left", vertical="center", indent=1)
    ws10.row_dimensions[11].height = 26
    for c in range(2, 11):
        ws10.cell(row=11, column=c).fill = fill_soft_pink
        ws10.cell(row=11, column=c).border = thin_border

    panitia_data = [
        ("Penanggung Jawab Acara", "Pakde Bambang S.", "0812-9876-5432", "Koordinasi saksi & penghulu KUA"),
        ("Koordinator Konsumsi", "Tante Ani Depok", "0813-1122-3344", "Pengawasan porsi katering & box panitia"),
        ("Penerima Tamu & Buku Tamu", "Sinta & Nanda", "0856-4433-2211", "Standby meja registrasi & souvenir"),
        ("Bendahara & Angpau", "Ibu Rina (Ibu Pengantin)", "0811-2233-4455", "Kunci kotak uang & serah terima amplop tips"),
        ("Koordinator Logistik & Mobil", "Mas Fajar Nugraha", "0818-7766-5544", "Pengawalan seserahan & koper busana")
    ]
    for idx, (p_role, p_name, p_tel, p_job) in enumerate(panitia_data, start=12):
        ws10.cell(row=idx, column=2, value=p_role).font = font_body_bold
        ws10.merge_cells(start_row=idx, start_column=2, end_row=idx, end_column=3)

        ws10.cell(row=idx, column=4, value=p_name).font = font_body
        ws10.merge_cells(start_row=idx, start_column=4, end_row=idx, end_column=5)

        ws10.cell(row=idx, column=6, value=p_tel).font = font_body_bold
        ws10.cell(row=idx, column=6).alignment = align_center

        ws10.cell(row=idx, column=7, value=p_job).font = font_body
        ws10.merge_cells(start_row=idx, start_column=7, end_row=idx, end_column=10)

        ws10.row_dimensions[idx].height = 22
        for c in range(2, 11):
            cell = ws10.cell(row=idx, column=c)
            cell.border = thin_border
            if idx % 2 == 1:
                cell.fill = fill_light_pink

    # Note Section C: Ide & Konsep Tambahan
    ws10.merge_cells("B18:J18")
    n_c = ws10.cell(row=18, column=2, value="✨  IDE KREATIF, PLAYLIST & SUASANA ACARA")
    n_c.font = font_section_white
    n_c.fill = fill_plum
    n_c.alignment = Alignment(horizontal="left", vertical="center", indent=1)
    ws10.row_dimensions[18].height = 26
    for c in range(2, 11):
        ws10.cell(row=18, column=c).fill = fill_plum
        ws10.cell(row=18, column=c).border = thin_border

    ideas = [
        ("Lagu Pengiring Masuk Pelaminan", "Kisah Romantis - Glenn Fredly / Sampai Jadi Debu - Banda Neira (Versi Akustik)"),
        ("Konsep Dress Code Undangan", "Bebas rapi sopan dengan sentuhan warna pastel / earth tone hangat"),
        ("Sovenir Tambahan untuk VIP", "Kotak teh premium artisan custom label ucapan terima kasih"),
        ("Moment Penyerahan Mahar", "Foto formal bersama kedua orang tua, saksi, dan penghulu langsung setelah ijab qobul")
    ]
    for idx, (i_title, i_desc) in enumerate(ideas, start=19):
        ws10.cell(row=idx, column=2, value=i_title).font = font_body_bold
        ws10.merge_cells(start_row=idx, start_column=2, end_row=idx, end_column=4)

        ws10.cell(row=idx, column=5, value=i_desc).font = font_body
        ws10.merge_cells(start_row=idx, start_column=5, end_row=idx, end_column=10)

        ws10.row_dimensions[idx].height = 22
        for c in range(2, 11):
            cell = ws10.cell(row=idx, column=c)
            cell.border = thin_border
            if idx % 2 == 1:
                cell.fill = fill_light_pink

    ws10_col_widths = {2: 18, 3: 16, 4: 18, 5: 18, 6: 18, 7: 18, 8: 18, 9: 18, 10: 25}
    for col_idx, width in ws10_col_widths.items():
        ws10.column_dimensions[get_column_letter(col_idx)].width = width
    ws10.column_dimensions["A"].width = 3

    # =========================================================================
    # SHEET 2: 02 — DASHBOARD (Now created with live references & charts)
    # =========================================================================
    ws2 = wb.create_sheet(title="02 — DASHBOARD", index=1)
    ws2.views.sheetView[0].showGridLines = True
    create_banner(ws2, "WEDDING COMMAND CENTER", "Pantau seluruh kemajuan persiapan, status anggaran, dan RSVP tamu secara real-time.", max_col=11)

    # Couple Header Info Box
    ws2.merge_cells("B5:F5")
    c_hdr = ws2.cell(row=5, column=2, value="💍  RINA & ARIF  •  12 OKTOBER 2026")
    c_hdr.font = Font(name=font_family, size=12, bold=True, color=C_DARK_PLUM)
    c_hdr.fill = fill_soft_pink
    c_hdr.alignment = Alignment(horizontal="left", vertical="center", indent=1)
    for c in range(2, 7):
        ws2.cell(row=5, column=c).fill = fill_soft_pink
        ws2.cell(row=5, column=c).border = thin_border

    ws2.merge_cells("G5:K5")
    c_loc = ws2.cell(row=5, column=7, value="📍 Grand Harmony Hotel, Jakarta Selatan  •  COUNTDOWN: H-20 HARI")
    c_loc.font = Font(name=font_family, size=9.5, bold=True, color=C_PLUM)
    c_loc.fill = fill_soft_pink
    c_loc.alignment = Alignment(horizontal="center", vertical="center")
    for c in range(7, 12):
        ws2.cell(row=5, column=c).fill = fill_soft_pink
        ws2.cell(row=5, column=c).border = thin_border
    ws2.row_dimensions[5].height = 28

    # 4 Main KPI Cards
    # Card 1: TOTAL BUDGET (from Sheet 3)
    create_kpi_card(ws2, start_row=7, start_col=2, width_cols=2, label="TOTAL ANGGARAN", value_formula="='03 — BUDGET'!B6")
    # Card 2: TERPAKAI / REALISASI (from Sheet 3)
    create_kpi_card(ws2, start_row=7, start_col=4, width_cols=2, label="TOTAL REALISASI", value_formula="='03 — BUDGET'!F6")
    # Card 3: SISA BUDGET (from Sheet 3)
    create_kpi_card(ws2, start_row=7, start_col=6, width_cols=2, label="SISA ANGGARAN", value_formula="='03 — BUDGET'!J6")
    # Card 4: PROGRESS CHECKLIST (from Sheet 4)
    create_kpi_card(ws2, start_row=7, start_col=8, width_cols=2, label="PROGRESS CHECKLIST", value_formula="='04 — CHECKLIST'!I6", format_str=PERCENT_FORMAT)
    # Card 5: TOTAL TAMU KONFIRMASI HADIR (from Sheet 7)
    create_kpi_card(ws2, start_row=7, start_col=10, width_cols=2, label="ESTIMASI KURSI HADIR", value_formula="='07 — GUEST LIST'!I6", format_str=NUMBER_FORMAT)

    # Next Things to Do Section
    ws2.merge_cells("B11:K11")
    todo_title = ws2.cell(row=11, column=2, value="⚡  NEXT THINGS TO DO (ACTION ITEMS PRIORITAS TINGGI)")
    todo_title.font = font_section
    todo_title.fill = fill_soft_pink
    todo_title.alignment = Alignment(horizontal="left", vertical="center", indent=1)
    ws2.row_dimensions[11].height = 26
    for c in range(2, 12):
        ws2.cell(row=11, column=c).fill = fill_soft_pink
        ws2.cell(row=11, column=c).border = thin_border

    todo_headers = ["NO", "PRIORITAS", "TUGAS & KEGIATAN KRUSIAL", "DEADLINE", "STATUS", "PANDUAN EKSEKUSI"]
    ws2.cell(row=12, column=2, value="NO").alignment = align_center
    ws2.cell(row=12, column=3, value="PRIORITAS").alignment = align_center
    ws2.cell(row=12, column=4, value="TUGAS & KEGIATAN KRUSIAL").alignment = align_left
    ws2.merge_cells("D12:F12")
    ws2.cell(row=12, column=7, value="DEADLINE").alignment = align_center
    ws2.cell(row=12, column=8, value="STATUS").alignment = align_center
    ws2.cell(row=12, column=9, value="PANDUAN EKSEKUSI").alignment = align_left
    ws2.merge_cells("I12:K12")

    for c in range(2, 12):
        cell = ws2.cell(row=12, column=c)
        cell.font = font_header_white
        cell.fill = fill_plum
        cell.border = header_border
    ws2.row_dimensions[12].height = 24

    dashboard_todos = [
        ("Tinggi", "Finalisasi rekap data tamu & konfirmasi kursi katering", "28 Sep 2026", "Dalam Proses", "Perbarui angka RSVP di sheet 07 — GUEST LIST agar katering akurat"),
        ("Tinggi", "Technical Meeting (TM) seluruh vendor dan kru WO di venue", "12 Sep 2026", "Dalam Proses", "Penyelarasan layout dekorasi, panggung, dan audio sound gedung"),
        ("Tinggi", "Pelunasan termin pembayaran vendor utama sebelum H-14", "01 Okt 2026", "Belum Mulai", "Pantau sisa tagihan pada sheet 06 — VENDOR"),
        ("Tinggi", "Pengambilan seluruh kotak seserahan hias & mahar frame", "03 Okt 2026", "Belum Mulai", "Cek kelengkapan barang pada sheet 08 — SESERAHAN"),
        ("Tinggi", "Verifikasi berkas fisik dan kehadiran di KUA bersama wali", "28 Sep 2026", "Dalam Proses", "Pastikan seluruh syarat pada sheet 09 — ADMINISTRASI lengkap"),
        ("Sedang", "Gladi resik akad nikah & pembacaan ijab qobul khidmat", "07 Okt 2026", "Belum Mulai", "Simulasi bersama calon pengantin, wali nikah, dan saksi")
    ]

    for idx, (prio, task_name, d_line, stat, guide) in enumerate(dashboard_todos, start=13):
        ws2.cell(row=idx, column=2, value=idx-12).alignment = align_center
        
        c_p = ws2.cell(row=idx, column=3, value=prio)
        c_p.alignment = align_center
        c_p.font = font_body_bold
        c_p.fill = PatternFill(start_color="FCE4EC", fill_type="solid")

        ws2.cell(row=idx, column=4, value=task_name).alignment = align_left
        ws2.merge_cells(start_row=idx, start_column=4, end_row=idx, end_column=6)

        ws2.cell(row=idx, column=7, value=d_line).alignment = align_center
        
        c_st = ws2.cell(row=idx, column=8, value=stat)
        c_st.alignment = align_center
        c_st.font = font_body_bold
        c_st.fill = fill_soft_mint if stat=="Selesai" else fill_lavender

        ws2.cell(row=idx, column=9, value=guide).alignment = align_left
        ws2.merge_cells(start_row=idx, start_column=9, end_row=idx, end_column=11)

        ws2.row_dimensions[idx].height = 22
        for c in range(2, 12):
            cell = ws2.cell(row=idx, column=c)
            if c not in [3, 8]: cell.font = font_body
            cell.border = thin_border
            if (idx - 13) % 2 == 1 and c not in [3, 8]:
                cell.fill = fill_light_pink

    # Helper table for Dashboard Charts (Columns M to P)
    # RSVP Summary Table
    ws2.cell(row=20, column=13, value="STATUS RSVP").font = font_header_white
    ws2.cell(row=20, column=13).fill = fill_plum
    ws2.cell(row=20, column=14, value="JUMLAH").font = font_header_white
    ws2.cell(row=20, column=14).fill = fill_plum

    rsvp_categories = [
        ("Konfirmasi Hadir", "='07 — GUEST LIST'!F6"),
        ("Belum Konfirmasi", "='07 — GUEST LIST'!G6"),
        ("Tidak Hadir", "='07 — GUEST LIST'!H6")
    ]
    for r_idx, (r_label, r_form) in enumerate(rsvp_categories, start=21):
        ws2.cell(row=r_idx, column=13, value=r_label).font = font_body
        ws2.cell(row=r_idx, column=13).border = thin_border
        c_v = ws2.cell(row=r_idx, column=14, value=r_form)
        c_v.font = font_body
        c_v.border = thin_border
        c_v.alignment = align_center

    # Checklist Summary Table
    ws2.cell(row=26, column=13, value="STATUS CHECKLIST").font = font_header_white
    ws2.cell(row=26, column=13).fill = fill_plum
    ws2.cell(row=26, column=14, value="JUMLAH").font = font_header_white
    ws2.cell(row=26, column=14).fill = fill_plum

    chk_categories = [
        ("Selesai", "='04 — CHECKLIST'!D6"),
        ("Dalam Proses", "='04 — CHECKLIST'!F6"),
        ("Belum Mulai", "='04 — CHECKLIST'!H6")
    ]
    for c_idx, (c_label, c_form) in enumerate(chk_categories, start=27):
        ws2.cell(row=c_idx, column=13, value=c_label).font = font_body
        ws2.cell(row=c_idx, column=13).border = thin_border
        c_v = ws2.cell(row=c_idx, column=14, value=c_form)
        c_v.font = font_body
        c_v.border = thin_border
        c_v.alignment = align_center

    # Add Native Excel Charts to Dashboard
    # Chart 1: Bar / Column Chart: Budget vs Realisasi
    chart_budget = BarChart()
    chart_budget.type = "col"
    chart_budget.style = 10
    chart_budget.title = "Alokasi Anggaran vs Realisasi per Kategori"
    chart_budget.y_axis.title = "Rupiah"
    chart_budget.x_axis.title = "Kategori Kebutuhan"
    chart_budget.height = 12
    chart_budget.width = 18

    data_b = Reference(ws3, min_col=16, min_row=10, max_col=17, max_row=22)
    cats_b = Reference(ws3, min_col=15, min_row=11, max_row=22)
    chart_budget.add_data(data_b, titles_from_data=True)
    chart_budget.set_categories(cats_b)
    ws2.add_chart(chart_budget, "B20")

    # Chart 2: Doughnut Chart: Status RSVP Tamu
    chart_rsvp = DoughnutChart()
    chart_rsvp.title = "Status RSVP Tamu Undangan"
    chart_rsvp.style = 10
    chart_rsvp.height = 12
    chart_rsvp.width = 14

    data_r = Reference(ws2, min_col=14, min_row=20, max_row=23)
    cats_r = Reference(ws2, min_col=13, min_row=21, max_row=23)
    chart_rsvp.add_data(data_r, titles_from_data=True)
    chart_rsvp.set_categories(cats_r)
    ws2.add_chart(chart_rsvp, "G20")

    # Column widths for Sheet 2
    ws2_col_widths = {2: 6, 3: 16, 4: 16, 5: 16, 6: 16, 7: 16, 8: 16, 9: 16, 10: 16, 11: 18, 13: 20, 14: 12}
    for col_idx, width in ws2_col_widths.items():
        ws2.column_dimensions[get_column_letter(col_idx)].width = width
    ws2.column_dimensions["A"].width = 3
    ws2.column_dimensions["L"].width = 3

    # Ensure clean tab colors for aesthetic creator vibe
    tab_colors = {
        "01 — START HERE": C_PLUM,
        "02 — DASHBOARD": C_DARK_PLUM,
        "03 — BUDGET": C_MUTED_ROSE,
        "04 — CHECKLIST": C_SOFT_PURPLE,
        "05 — TIMELINE": C_MUTED_GOLD,
        "06 — VENDOR": C_PLUM,
        "07 — GUEST LIST": C_MUTED_ROSE,
        "08 — SESERAHAN": C_DARK_PLUM,
        "09 — ADMINISTRASI": C_SOFT_PURPLE,
        "10 — CATATAN": C_PLUM
    }
    for sheet in wb.worksheets:
        if sheet.title in tab_colors:
            sheet.sheet_properties.tabColor = tab_colors[sheet.title]

    # Save workbook
    wb.save(output_filename)
    print(f"Successfully generated: {output_filename}")

if __name__ == "__main__":
    build_wedding_planner()
