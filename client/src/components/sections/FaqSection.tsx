import React from 'react'
import { Badge } from '../ui/Badge'
import { AccordionItem } from '../ui/Accordion'

export const FaqSection: React.FC = () => {
  const faqs = [
    {
      number: '01',
      title: 'Apakah ada potongan komisi atau biaya agen dari Reffband?',
      content: 'Tidak ada potongan sepeser pun. Reffband adalah direktori kurasi terbuka. Seluruh kesepakatan honor dan pembayaran dilakukan langsung antara pihak penyelenggara dan pihak musisi via WhatsApp atau rekening resmi band.',
      defaultOpen: true,
    },
    {
      number: '02',
      title: 'Bagaimana cara penyelenggara menghubungi band yang diminati?',
      content: 'Di setiap kartu profil band, terdapat tombol direct WhatsApp yang terhubung langsung ke nomor kontak manajer resmi band yang telah terverifikasi saat pendaftaran.',
    },
    {
      number: '03',
      title: 'Mengapa format technical rider penting untuk diisi?',
      content: 'Banyak kendala panggung terjadi akibat sound engineer venue tidak mengetahui jumlah channel input, jenis mikrofon drum, atau monitor mix yang dibutuhkan. Dengan rider transparan di profil band, tim produksi venue dapat mempersiapkan alat sejak awal.',
    },
    {
      number: '04',
      title: 'Apakah pendaftaran profil band dipungut biaya?',
      content: 'Pendaftaran profil musisi dan band di Reffband 100% gratis. Musisi cukup membuat akun, mengisi informasi band, mengunggah audio sampel, serta melengkapi spesifikasi rider panggung.',
    },
    {
      number: '05',
      title: 'Bagaimana jika alat di venue kami berbeda dengan rider band?',
      content: 'Anda dapat mendiskusikan opsi substitusi alat langsung dengan manajer band melalui WhatsApp sebelum menandatangani kesepakatan jadwal dan technical meeting.',
    },
  ]

  return (
    <section id="faq" className="py-24 bg-[#0A0A0A]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="space-y-3 mb-16 text-center max-w-2xl mx-auto">
          <Badge variant="red" dot>
            06 // TANYA JAWAB (FAQ)
          </Badge>
          <h2 className="font-display font-black text-3xl sm:text-5xl text-white tracking-tight uppercase">
            PERTANYAAN UMUM
          </h2>
          <p className="text-sm sm:text-base text-[#9E9E9E] leading-relaxed">
            Semua yang perlu Anda ketahui mengenai mekanisme booking, technical rider, dan ekosistem Reffband.
          </p>
        </div>

        <div className="space-y-3">
          {faqs.map((f) => (
            <AccordionItem
              key={f.number}
              number={f.number}
              title={f.title}
              content={f.content}
              defaultOpen={f.defaultOpen}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
