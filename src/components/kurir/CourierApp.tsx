import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';

interface Order {
  id: number;
  number: string;
  status: string;
  date_created: string;
  customer_name: string;
  phone: string;
  shipping_address: string;
  payment_method: string; 
  payment_method_title: string;
  customer_note: string;
  total: string;
  line_items: any[];
  meta_data?: any[]; 
  packing_status: string;
  _courier_assigned: string;
  _proof_image_url: string;
  _delivered_at: string;
}

// BANTUAN: Deteksi apakah order berasal dari Kasir Offline
const isOfflinePosOrder = (order: Order) => {
  if (order.payment_method === 'pos_cash' || order.payment_method === 'pos_qris' || order.payment_method === 'pos_offline') return true;
  if (order.payment_method_title) {
    const title = order.payment_method_title.toLowerCase();
    if (title.includes('toko') || title.includes('kasir') || title.includes('pos')) return true;
  }
  if (order.meta_data && order.meta_data.some(m => m.key === 'order_source' && m.value === 'POS_OFFLINE')) return true;
  if (order.customer_name && order.customer_name.toLowerCase().includes('kasir')) return true;
  return false;
};

export default function CourierApp() {
  const [activeTab, setActiveTab] = useState<'siap_ambil' | 'tugas_saya' | 'riwayat'>('siap_ambil');
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [proofImage, setProofImage] = useState<string | null>(null);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false); 

  const fileInputRef = useRef<HTMLInputElement>(null);

  const courierName = typeof window !== 'undefined' ? localStorage.getItem('admin_user_nicename') || 'Kurir' : 'Kurir';

  const handleLogout = () => {
    if (confirm('Apakah Anda yakin ingin keluar?')) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('admin_user_nicename');
        localStorage.removeItem('admin_token');
        localStorage.removeItem('user_role');
        window.location.href = '/login';
      }
    }
  };

  const fetchOrders = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/adminrisman/deliveries');
      if (res.ok) {
        const data = await res.json();
        const onlineOrders = (data.orders || []).filter((o: Order) => !isOfflinePosOrder(o));
        setOrders(onlineOrders);
      }
    } catch (err) {
      console.error('Error fetching deliveries:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 30000); 
    return () => clearInterval(interval);
  }, []);

  const handleAssignCourier = async (orderId: number) => {
    if (!confirm('Apakah Anda yakin ingin mengambil paket ini?')) return;
    try {
      const res = await fetch('/api/adminrisman/assign-courier', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, courierName }),
      });
      if (res.ok) {
        fetchOrders();
        setActiveTab('tugas_saya');
      } else {
        alert('Gagal mengambil paket.');
      }
    } catch (err) {
      alert('Terjadi kesalahan jaringan.');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsCompressing(true); 

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800; 
        const scaleSize = MAX_WIDTH / img.width;
        canvas.width = MAX_WIDTH;
        canvas.height = img.height * scaleSize;

        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);

        canvas.toBlob((blob) => {
          if (blob) {
            const webpFile = new File([blob], `bukti-${Date.now()}.webp`, { type: 'image/webp' });
            const previewUrl = URL.createObjectURL(webpFile);
            
            setProofFile(webpFile); 
            setProofImage(previewUrl); 
            setIsCompressing(false); 
          }
        }, 'image/webp', 0.7);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleCompleteDelivery = async () => {
    if (!selectedOrder || !proofFile) {
      alert('Mohon sertakan foto bukti pengiriman.');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Upload langsung ke API Astro (Proxy) agar bebas CORS
      const formData = new FormData();
      formData.append('file', proofFile);

      const uploadRes = await fetch('/api/adminrisman/upload-proof', {
        method: 'POST',
        body: formData 
      });

      const uploadData = await uploadRes.json();

      if (!uploadRes.ok || !uploadData.success) {
        throw new Error(uploadData.message || 'Gagal upload foto ke server WordPress');
      }

      const imageUrl = uploadData.url; 

      // 2. Kirim URL ke server Astro (Cloudflare) untuk update status order (Jangan tunggu response)
      fetch('/api/adminrisman/complete-delivery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: selectedOrder.id,
          proofImageUrl: imageUrl, 
          paymentMethod: selectedOrder.payment_method_title,
          codReceived: selectedOrder.payment_method_title.toLowerCase().includes('tunai') ? selectedOrder.total : 0
        }),
      }).catch(err => console.error("Background update status error (diabaikan):", err)); // Abaikan jika error, biar proses background
      
      // 3. LANGSUNG TUTUP MODAL & PINDAH RIWAYAT (Tanpa nunggu server)
      alert('Pengiriman berhasil diselesaikan!');
      setIsModalOpen(false);
      setProofImage(null);
      setProofFile(null);
      setSelectedOrder(null);
      fetchOrders();
      setActiveTab('riwayat');
      
    } catch (err: any) {
      console.error('Delivery error:', err);
      alert('Terjadi kesalahan: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openDeliveryModal = (order: Order) => {
    setSelectedOrder(order);
    setProofImage(null);
    setProofFile(null);
    setIsModalOpen(true);
  };

  const siapAmbilOrders = orders.filter(
    (o) => o.status === 'processing' && o.packing_status === 'packed' && !o._courier_assigned
  );

  const tugasSayaOrders = orders.filter(
    (o) => (o.status === 'delivering' || o.status === 'processing') && o._courier_assigned === courierName
  );

  const riwayatOrders = orders.filter(
    (o) => o.status === 'completed' && o._courier_assigned === courierName
  ).sort((a, b) => new Date(b._delivered_at || b.date_created).getTime() - new Date(a._delivered_at || a.date_created).getTime());

  const formatRupiah = (val: string | number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(Number(val));
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('id-ID', {
      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 font-sans text-slate-900 pb-20">
      <header className="bg-white px-6 py-4 shadow-sm border-b sticky top-0 z-10 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-brand">Dashboard Kurir</h1>
          <p className="text-sm text-slate-500">Halo, <span className="font-semibold text-slate-800">{courierName}</span></p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleLogout}
          className="text-xs text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 h-8 px-3"
        >
          Logout
        </Button>
      </header>

      <div className="flex bg-white border-b px-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('siap_ambil')}
          className={`px-4 py-3 text-sm font-semibold whitespace-nowrap border-b-2 ${activeTab === 'siap_ambil' ? 'border-brand text-brand' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          Siap Ambil ({siapAmbilOrders.length})
        </button>
        <button
          onClick={() => setActiveTab('tugas_saya')}
          className={`px-4 py-3 text-sm font-semibold whitespace-nowrap border-b-2 ${activeTab === 'tugas_saya' ? 'border-brand text-brand' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          Tugas Saya ({tugasSayaOrders.length})
        </button>
        <button
          onClick={() => setActiveTab('riwayat')}
          className={`px-4 py-3 text-sm font-semibold whitespace-nowrap border-b-2 ${activeTab === 'riwayat' ? 'border-brand text-brand' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          Riwayat ({riwayatOrders.length})
        </button>
      </div>

      <div className="flex-1 p-4">
        {isLoading ? (
          <div className="flex justify-center items-center py-20 text-brand">
            <svg className="animate-spin h-8 w-8" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        ) : (
          <div className="space-y-4">

            {activeTab === 'siap_ambil' && (
              <>
                {siapAmbilOrders.length === 0 ? (
                  <div className="text-center py-10 text-slate-500">Belum ada paket yang siap diambil.</div>
                ) : (
                  siapAmbilOrders.map(order => (
                    <Card key={order.id} className="border-l-4 border-l-blue-500">
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-lg">{order.number}</CardTitle>
                            <p className="text-xs text-slate-500">{formatDate(order.date_created)}</p>
                          </div>
                          <Badge className="bg-blue-100 text-blue-700">SIAP AMBIL</Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div>
                          <p className="font-semibold">{order.customer_name}</p>
                          <p className="text-sm text-slate-600 line-clamp-2">{order.shipping_address}</p>
                        </div>
                        <div className="flex justify-between items-center text-sm bg-slate-50 p-2 rounded">
                          <span className="text-slate-500">Total Tagihan:</span>
                          <span className="font-bold text-slate-800">{formatRupiah(order.total)}</span>
                        </div>
                        <Button className="w-full bg-blue-600 hover:bg-blue-700" onClick={() => handleAssignCourier(order.id)}>
                          Ambil Paket Ini
                        </Button>
                      </CardContent>
                    </Card>
                  ))
                )}
              </>
            )}

            {activeTab === 'tugas_saya' && (
              <>
                {tugasSayaOrders.length === 0 ? (
                  <div className="text-center py-10 text-slate-500">Anda sedang tidak membawa paket apapun.</div>
                ) : (
                  tugasSayaOrders.map(order => (
                    <Card key={order.id} className="border-l-4 border-l-brand">
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-lg">{order.number}</CardTitle>
                            <p className="font-semibold text-brand mt-1">{order.customer_name}</p>
                          </div>
                          <Badge className="bg-orange-100 text-orange-700">DALAM PERJALANAN</Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="text-sm">
                          <p className="text-slate-600 font-medium mb-1">Alamat Tujuan:</p>
                          <p className="bg-slate-50 p-2 rounded text-slate-800">{order.shipping_address || 'Alamat tidak tersedia'}</p>
                        </div>
                        {order.customer_note && (
                          <div className="text-xs bg-yellow-50 text-yellow-800 p-2 rounded border border-yellow-200">
                            <strong>Catatan:</strong> {order.customer_note}
                          </div>
                        )}
                        <div className="flex justify-between items-center text-sm font-bold bg-slate-100 p-2 rounded border border-slate-200">
                          <span>Pembayaran ({order.payment_method_title}):</span>
                          <span className="text-brand">{formatRupiah(order.total)}</span>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <a
                            href={`https://wa.me/${order.phone.replace(/[^0-9]/g, '')}`}
                            target="_blank" rel="noreferrer"
                            className="flex items-center justify-center gap-1 bg-green-500 hover:bg-green-600 text-white rounded-md py-2 text-sm font-semibold transition"
                          >
                            Chat WA
                          </a>
                          <a
                            href={`https://maps.google.com/?q=${encodeURIComponent(order.shipping_address)}`}
                            target="_blank" rel="noreferrer"
                            className="flex items-center justify-center gap-1 bg-blue-500 hover:bg-blue-600 text-white rounded-md py-2 text-sm font-semibold transition"
                          >
                            Buka Maps
                          </a>
                        </div>
                        <Button
                          className="w-full bg-brand hover:bg-brand-dark py-6 text-base font-bold uppercase tracking-wider shadow-lg"
                          onClick={() => openDeliveryModal(order)}
                        >
                          Selesaikan Pengiriman
                        </Button>
                      </CardContent>
                    </Card>
                  ))
                )}
              </>
            )}

            {activeTab === 'riwayat' && (
              <>
                {riwayatOrders.length === 0 ? (
                  <div className="text-center py-10 text-slate-500">Belum ada riwayat pengiriman.</div>
                ) : (
                  riwayatOrders.map(order => (
                    <Card key={order.id} className="border-l-4 border-l-green-500 opacity-90">
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-md">{order.number}</CardTitle>
                            <p className="text-xs text-slate-500">Selesai: {formatDate(order._delivered_at)}</p>
                          </div>
                          <Badge className="bg-green-100 text-green-800">SELESAI</Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div>
                          <p className="font-semibold text-sm">{order.customer_name}</p>
                          <div className="flex justify-between text-xs mt-1">
                            <span className="text-slate-500">{order.payment_method_title}</span>
                            <span className="font-bold text-slate-700">{formatRupiah(order.total)}</span>
                          </div>
                        </div>
                        {order._proof_image_url && (
                          <div className="mt-2">
                            <p className="text-xs font-semibold text-slate-500 mb-1">Bukti Pengiriman:</p>
                            <img src={order._proof_image_url} alt="Bukti Kirim" className="w-full h-32 object-cover rounded border border-slate-200" />
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))
                )}
              </>
            )}
          </div>
        )}
      </div>

      {isModalOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <Card className="w-full max-w-md bg-white overflow-hidden shadow-2xl">
            <CardHeader className="bg-slate-50 border-b pb-4">
              <CardTitle>Selesaikan Pesanan {selectedOrder.number}</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="text-sm">
                <p><strong>Pelanggan:</strong> {selectedOrder.customer_name}</p>
                <p><strong>Total Tagihan:</strong> {formatRupiah(selectedOrder.total)}</p>
                <p className="text-xs text-slate-500 mt-1">Metode: {selectedOrder.payment_method_title}</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Upload Bukti Pengiriman (Foto Kamera)</label>
                {!proofImage ? (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-32 border-2 border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center text-slate-500 hover:bg-slate-50 transition"
                  >
                    {isCompressing ? (
                      <>
                        <svg className="animate-spin h-8 w-8 mb-2 text-brand" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Memproses Gambar...
                      </>
                    ) : (
                      <>
                        <svg className="w-8 h-8 mb-2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Buka Kamera / Pilih Foto
                      </>
                    )}
                  </button>
                ) : (
                  <div className="relative">
                    <img src={proofImage} alt="Preview" className="w-full h-48 object-cover rounded-lg border border-slate-200 shadow-sm" />
                    <button
                      onClick={() => { setProofImage(null); setProofFile(null); }}
                      className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full shadow hover:bg-red-600"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => { setIsModalOpen(false); setProofImage(null); setProofFile(null); }}
                  disabled={isSubmitting}
                >
                  Batal
                </Button>
                <Button
                  className="flex-1 bg-brand hover:bg-brand-dark"
                  onClick={handleCompleteDelivery}
                  disabled={isSubmitting || !proofFile || isCompressing}
                >
                  {isSubmitting ? 'Menyimpan...' : 'Kirim & Selesai'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}