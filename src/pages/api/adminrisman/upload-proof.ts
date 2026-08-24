import type { APIRoute } from 'astro';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
    try {
        // 1. Terima file foto dari HP Kurir
        const formData = await request.formData();
        const file = formData.get('file') as File;
        
        if (!file) {
            return new Response(JSON.stringify({ message: 'File tidak ditemukan' }), { status: 400 });
        }

        // 2. Siapkan form data baru untuk diteruskan ke WordPress
        const wpFormData = new FormData();
        wpFormData.append('file', file, file.name);

        // 3. Konfigurasi WordPress
        const WORDPRESS_API_URL = 'https://wp.lasayurku.com';
        const WP_API_KEY = 'Kur1rL4s4yurku2024S3cur3K3y!';

        // 4. Kirim file ke WordPress dari server Astro (Bebas CORS)
        const wpRes = await fetch(`${WORDPRESS_API_URL}/wp-json/lasayurku/v1/upload-delivery-proof`, {
            method: 'POST',
            headers: {
                'x-api-key': WP_API_KEY
                // Jangan set Content-Type di sini, biarkan browser/Node yang atur untuk FormData
            },
            body: wpFormData
        });

        const wpData = await wpRes.json();

        if (!wpRes.ok) {
            throw new Error(wpData.message || 'Gagal upload ke WordPress');
        }

        // 5. Kirim balik URL foto ke HP Kurir
        return new Response(JSON.stringify({ 
            success: true, 
            url: wpData.url 
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error: any) {
        console.error('[Astro Proxy Upload Error]:', error);
        return new Response(JSON.stringify({ 
            success: false, 
            message: error.message || 'Gagal memproses di server Astro' 
        }), { status: 500 });
    }
};