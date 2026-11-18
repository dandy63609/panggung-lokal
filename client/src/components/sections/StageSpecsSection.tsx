import React, { useState } from 'react'
import { Play, Pause, Sliders, Activity } from 'lucide-react'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'

export const StageSpecsSection: React.FC = () => {
  const [isPlayingAudio, setIsPlayingAudio] = useState(false)
  const [activeTab, setActiveTab] = useState<'channels' | 'mics' | 'monitors' | 'hospitality'>('channels')

  // 24 animated wave bars
  const waveHeights = [12, 24, 18, 32, 28, 40, 22, 36, 44, 26, 18, 38, 42, 28, 16, 30, 48, 34, 20, 26, 36, 18, 22, 14]

  return (
    <section id="stage" className="py-24 bg-[#0D0D0D] border-b border-[#242424] relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="space-y-3 mb-16 max-w-3xl">
          <Badge variant="yellow" dot>
            03 // STAGE 01 : AUDIO & TECHNICAL RIDER
          </Badge>
          <h2 className="font-display font-black text-3xl sm:text-5xl text-white tracking-tight uppercase">
            TRANSPARANSI KEBUTUHAN PANGGUNG
          </h2>
          <p className="text-sm sm:text-base text-[#9E9E9E] leading-relaxed">
            Tidak ada lagi kejutan teknis di venue panggung. Setiap profil musisi dilengkapi technical rider terstandarisasi mulai dari kebutuhan channel input mixer, spesifikasi mikrofon, hingga sistem monitoring.
          </p>
        </div>

        {/* Interactive Audio Player & Rider Console */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* Left: Waveform Player Box */}
          <div className="lg:col-span-5 bg-[#141414] border border-[#2B2B2B] p-6 sm:p-8 flex flex-col justify-between">
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-[#222222] pb-4">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[#E01E37]" />
                  <span className="text-xs font-mono font-bold uppercase text-white tracking-wider">
                    Audio Preview Console
                  </span>
                </div>
                <Badge variant="red" dot>
                  48kHz / 24-BIT
                </Badge>
              </div>

              <div>
                <span className="text-xs font-mono text-[#E01E37] uppercase">Demo Track Live Session</span>
                <h3 className="font-display font-bold text-2xl text-white mt-1">
                  Distorsi Liar : Rima Pembangkang
                </h3>
                <p className="text-xs text-[#757575] mt-1 font-mono">
                  Direkam langsung dari FOH Console pada Festival Indie Bandung
                </p>
              </div>

              {/* Waveform Visualizer */}
              <div className="bg-[#0A0A0A] border border-[#242424] p-4 flex items-center justify-center gap-1.5 h-28 overflow-hidden">
                {waveHeights.map((h, i) => (
                  <div
                    key={i}
                    className={`w-1.5 bg-[#E01E37] transition-all duration-150 ${
                      isPlayingAudio ? 'wave-bar' : ''
                    }`}
                    style={{
                      height: isPlayingAudio ? undefined : `${h * 0.7}px`,
                      animationDelay: `${(i % 5) * 0.15}s`,
                      opacity: isPlayingAudio ? 0.9 : 0.4,
                    }}
                  />
                ))}
              </div>

              {/* Player Controls */}
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setIsPlayingAudio(!isPlayingAudio)}
                  className="min-h-[44px] px-5 py-2.5 bg-[#E01E37] hover:bg-[#C71B30] text-white font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-colors cursor-pointer"
                  aria-label={isPlayingAudio ? 'Jeda Audio Track' : 'Putar Audio Track'}
                >
                  {isPlayingAudio ? (
                    <>
                      <Pause className="w-4 h-4" />
                      <span>Jeda Audio</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      <span>Putar Sample</span>
                    </>
                  )}
                </button>

                <div className="text-right">
                  <div className="text-xs font-mono text-white font-bold">
                    {isPlayingAudio ? '01:24 / 03:45' : '00:00 / 03:45'}
                  </div>
                  <div className="text-[10px] font-mono text-[#616161]">STEREO MASTER</div>
                </div>
              </div>
            </div>

            <div className="pt-6 mt-6 border-t border-[#222222] text-xs font-mono text-[#757575] flex items-center justify-between">
              <span>FORMAT LOSSLESS AUDIO</span>
              <span className="text-[#00D9FF]">DIRECT EMBED</span>
            </div>
          </div>

          {/* Right: Technical Rider Spec Sheet */}
          <div className="lg:col-span-7 bg-[#161616] border border-[#2B2B2B] p-6 sm:p-8 flex flex-col justify-between">
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-[#242424] pb-4">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-[#00D9FF]" />
                  <span className="text-xs font-mono font-bold uppercase text-white tracking-wider">
                    Standardized Technical Rider
                  </span>
                </div>
                <span className="text-xs font-mono text-[#9E9E9E]">STAGE REQUIREMENT SPEC</span>
              </div>

              {/* Rider Tabs */}
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'channels', label: 'Channel List (FOH)' },
                  { id: 'mics', label: 'Mic & DI Box' },
                  { id: 'monitors', label: 'Monitor Mix' },
                  { id: 'hospitality', label: 'Hospitality' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`px-3 py-2 text-xs font-mono uppercase tracking-wider min-h-[44px] border transition-colors ${
                      activeTab === tab.id
                        ? 'bg-[#E01E37] text-white border-[#E01E37] font-bold'
                        : 'bg-[#1F1F1F] text-[#9E9E9E] border-[#2E2E2E] hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab Contents */}
              <div className="bg-[#121212] border border-[#242424] p-5 font-mono text-xs text-[#B0B0B0] space-y-3">
                {activeTab === 'channels' && (
                  <div className="space-y-2">
                    <div className="text-white font-bold pb-2 border-b border-[#202020] flex justify-between">
                      <span>CH / INSTRUMEN</span>
                      <span>TRANSDUCER / INPUT</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-[#1A1A1A]">
                      <span>CH 01 - Kick Drum</span>
                      <span className="text-white">AKG D112 / Shure Beta 52A</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-[#1A1A1A]">
                      <span>CH 02 - Snare Top</span>
                      <span className="text-white">Shure SM57</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-[#1A1A1A]">
                      <span>CH 03 - Bass Guitar</span>
                      <span className="text-white">Active DI Box (BSS / Radial)</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-[#1A1A1A]">
                      <span>CH 04 - Electric Guitar L</span>
                      <span className="text-white">Sennheiser e609 / Mic Cabinet</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span>CH 05 - Lead Vocal</span>
                      <span className="text-white">Shure Beta 58A (Wireless/Wired)</span>
                    </div>
                  </div>
                )}

                {activeTab === 'mics' && (
                  <div className="space-y-2.5">
                    <div className="text-white font-bold pb-2 border-b border-[#202020]">
                      KEBUTUHAN MIKROFON & KABEL
                    </div>
                    <p className="text-xs text-[#8A8A8A]">
                      • 3x Dynamic vocal microphone (Shure SM58 / Beta 58 atau setara)<br />
                      • 2x Active DI Box untuk instrumen akustik & bass<br />
                      • 4x Boom microphone stand berat stabil<br />
                      • Semua kabel XLR seimbang (balanced) minimum 10 meter
                    </p>
                  </div>
                )}

                {activeTab === 'monitors' && (
                  <div className="space-y-2.5">
                    <div className="text-white font-bold pb-2 border-b border-[#202020]">
                      MONITOR STAGE AUX MIX
                    </div>
                    <p className="text-xs text-[#8A8A8A]">
                      • AUX 1 (Drummer): Wedge 15" + Subwoofer / IEM stereo line<br />
                      • AUX 2 (Vocal Center): 2x Wedge 12" low-profile<br />
                      • AUX 3 (Guitar & Bass Stage Left/Right): 2x Wedge 12"<br />
                      • Side-fills opsional untuk panggung outdoor &gt; 10 meter
                    </p>
                  </div>
                )}

                {activeTab === 'hospitality' && (
                  <div className="space-y-2.5">
                    <div className="text-white font-bold pb-2 border-b border-[#202020]">
                      KONSUMSI & RUANG TUNGGU
                    </div>
                    <p className="text-xs text-[#8A8A8A]">
                      • Ruang tunggu musisi yang bersih dan aman dengan stopkontak listrik<br />
                      • Air mineral bebas dingin secukupnya untuk 5 personel<br />
                      • Makanan berat atau snack sebelum waktu soundcheck
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-6 mt-6 border-t border-[#242424] flex flex-col sm:flex-row items-center justify-between gap-4">
              <span className="text-xs font-mono text-[#757575]">
                Dibuat otomatis dari data registrasi band
              </span>
              <a href="/register.html">
                <Button variant="primary" size="sm">
                  Buat Rider Band Anda
                </Button>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
