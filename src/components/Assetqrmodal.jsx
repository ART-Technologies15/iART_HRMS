import React, { useEffect, useState } from "react";
import { X, Download, Loader2, QrCode } from "lucide-react";
import { toast } from "react-toastify";
import { generateQrDataUrl, buildAssetQrPayload } from "./qrCode";
import { downloadSingleAssetQrPdf } from "./assetQrPdf";

const AssetQRModal = ({ open, onClose, asset }) => {
    const [qrDataUrl, setQrDataUrl] = useState(null);
    const [loading, setLoading] = useState(false);
    const [downloading, setDownloading] = useState(false);

    useEffect(() => {
        if (!open || !asset) return;
        setQrDataUrl(null);

        const generate = async () => {
            try {
                setLoading(true);
                const url = await generateQrDataUrl(buildAssetQrPayload(asset), 320);
                setQrDataUrl(url);
            } catch {
                toast.error("Failed to generate QR code");
            } finally {
                setLoading(false);
            }
        };

        generate();
    }, [open, asset]);

    if (!open || !asset) return null;

    const handleDownload = async () => {
        try {
            setDownloading(true);
            await downloadSingleAssetQrPdf(asset);
        } catch {
            toast.error("Failed to generate PDF");
        } finally {
            setDownloading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4">
            <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl ring-1 ring-slate-900/5">
                <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                        <QrCode size={16} className="text-indigo-600" /> Asset QR Code
                    </h3>
                    <button
                        onClick={onClose}
                        className="rounded-full p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Name on top / QR in the middle / code on the bottom */}
                <div className="flex flex-col items-center gap-4 px-6 py-8">
                    <h2 className="line-clamp-2 text-center text-base font-semibold text-slate-900">{asset.assetName}</h2>

                    <div className="flex h-56 w-56 items-center justify-center rounded-xl border border-slate-200 bg-white p-3">
                        {loading || !qrDataUrl ? (
                            <Loader2 size={28} className="animate-spin text-slate-300" />
                        ) : (
                            <img
                                src={qrDataUrl}
                                alt={`QR code for ${asset.assetCode}`}
                                className="h-full w-full object-contain"
                            />
                        )}
                    </div>

                    <p className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium tracking-wide text-slate-600">
                        {asset.assetCode}
                    </p>
                </div>

                <div className="flex justify-end gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4">
                    <button
                        onClick={onClose}
                        className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-white"
                    >
                        Close
                    </button>
                    <button
                        onClick={handleDownload}
                        disabled={downloading || loading}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {downloading ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
                        {downloading ? "Generating..." : "Download PDF"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AssetQRModal;