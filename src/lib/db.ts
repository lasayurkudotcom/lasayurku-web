// Fallback Mock DB agar aplikasi tidak crash karena better-sqlite3 di Node.js v24 Windows
export const db = {
    prepare: () => ({
        run: () => { },
        get: () => null,
        all: () => [],
    }),
    exec: () => { },
};

export function logPosOrder(orderId: number, total: number, cashier: string) {
    console.log(`[POS LOG] Order #${orderId} - Total: Rp${total} - Kasir: ${cashier}`);
}

export default db;