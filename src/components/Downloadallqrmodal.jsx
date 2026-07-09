import React, { useState } from "react";
import { X, Download, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "react-toastify";
import { downloadAllAssetsQrPdf } from "./assetQrPdf";

const DownloadAllQrModal = ({ open, onClose, assets = [] }) => {
    const [generating, setGenerating] = useState(false);
    const [progress, setProgress] = useState({ done: 0, total: 0 });

    if (!open) return null;

    const handleConfirm = async () => {
        if (assets.length === 0) {
            toast.error("No assets found to generate QR codes for.");
            return;
        }
        try {
            setGenerating(true);
            setProgress({ done: 0, total: assets.length });
            await downloadAllAssetsQrPdf(assets, (done, total) => setProgress({ done, total }));
            toast.success("QR code PDF downloaded");
            onClose();
        } catch {
            toast.error("Failed to generate the QR code PDF");
        } finally {
            setGenerating(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4">
            <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl ring-1 ring-slate-900/5">
                <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
                    <h3 className="text-base font-semibold text-slate-900">Download All Asset QR Codes</h3>
                    {!generating && (
                        <button
                            onClick={onClose}
                            className="rounded-full p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                        >
                            <X size={18} />
                        </button>
                    )}
                </div>

                <div className="px-6 py-5 text-sm text-slate-600">
                    {!generating ? (
                        <>
                            <div className="mb-3 flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-3 text-xs text-amber-700">
                                <AlertTriangle size={15} className="mt-0.5 shrink-0" />
                                <span>
                                    This will generate a single PDF with a QR code for every one of the{" "}
                                    <strong>{assets.length}</strong> asset{assets.length === 1 ? "" : "s"} currently matching your
                                    filters. Larger lists can take a moment to generate.
                                </span>
                            </div>
                            <p>Are you sure you want to continue?</p>
                        </>
                    ) : (
                        <div className="flex flex-col items-center gap-3 py-4">
                            <Loader2 size={24} className="animate-spin text-indigo-600" />
                            <p className="text-sm text-slate-600">
                                Generating {progress.done} / {progress.total}...
                            </p>
                            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                                <div
                                    className="h-full rounded-full bg-indigo-600 transition-all"
                                    style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }}
                                />
                            </div>
                        </div>
                    )}
                </div>

                {!generating && (
                    <div className="flex justify-end gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4">
                        <button
                            onClick={onClose}
                            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-white"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleConfirm}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700"
                        >
                            <Download size={15} /> Download All
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DownloadAllQrModal;