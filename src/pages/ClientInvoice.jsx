import React, { useState, useRef, useMemo, useEffect, useLayoutEffect } from 'react'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import iArtLogo from "../assets/logoiart.svg";

/**
 * Client Invoice generator — fully client-side.
 *
 * Requires:  npm install jspdf html2canvas
 *
 * - Left: editable form (company, client, items, taxes, notes, bank details) — scrolls on its own.
 * - Right: live, paginated A4 preview, pinned in view and scaled to fit — never scrolls.
 * - "Generate PDF" captures each rendered preview page (at true A4 size, unscaled) with
 *   html2canvas and stitches them into a multi-page PDF with jsPDF — no server involved.
 *
 * NOTE on the "oklch" crash: html2canvas cannot parse modern CSS color functions like
 * oklch()/lab()/color-mix() — it only understands rgb()/rgba()/hex. Newer Tailwind
 * builds (v4) generate their palette using oklch() under the hood, so any Tailwind
 * color utility class (bg-cyan-700, text-gray-500, border-gray-200, etc.) that lands on
 * an element passed into html2canvas will throw "Attempting to parse an unsupported
 * color function oklch" the moment html2canvas tries to read its computed style.
 * The fix used below: the whole <InvoicePage> (the part that actually gets
 * rasterized into the PDF) is written with plain inline styles / hex colors only —
 * zero Tailwind classes — so html2canvas never encounters an oklch() value. The left-hand
 * editing form still uses Tailwind freely since it's never captured.
 */

// ---- constants -------------------------------------------------------

const A4_WIDTH = 794 // px @ 96dpi
const A4_HEIGHT = 1123
const ITEMS_PER_PAGE = 8

// Palette pulled from Sample_invoice.xlsx so the PDF matches the reference invoice.
const ACCENT = '#0C77F4' // header / brand blue used in the xlsx template
const ACCENT_DARK = '#1155CC' // "Balance Due" label blue
const TOTAL_BG = '#C9DAF8' // light blue fill behind the final total figure
const INK = '#333F4F' // body / label slate used throughout the xlsx
const INK_LIGHT = '#5B6472'
const BORDER = '#D7DEE8'

const uid = () => Math.random().toString(36).slice(2, 9)

const money = (n) =>
    `₹${(Number(n) || 0).toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`

const formatDate = (date) => {
    if (!date) return "";

    return new Date(date).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
};

// ---- small form primitives -------------------------------------------

const Section = ({ title, children, action }) => (
    <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5 space-y-3">
        <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">{title}</h2>
            {action}
        </div>
        {children}
    </div>
)

const Field = ({ label, className = '', ...props }) => (
    <label className={`block ${className}`}>
        {label && <span className="block text-xs font-medium text-gray-500 mb-1">{label}</span>}
        <input
            {...props}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-cyan-600/40 focus:border-cyan-600"
        />
    </label>
)

const TextArea = ({ label, className = '', ...props }) => (
    <label className={`block ${className}`}>
        {label && <span className="block text-xs font-medium text-gray-500 mb-1">{label}</span>}
        <textarea
            {...props}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-cyan-600/40 focus:border-cyan-600 resize-none"
        />
    </label>
)

const IconBtn = ({ onClick, title, danger, children }) => (
    <button
        type="button"
        onClick={onClick}
        title={title}
        className={`shrink-0 w-8 h-8 flex items-center justify-center rounded-lg border text-sm font-medium transition-colors ${danger
            ? 'border-red-200 text-red-500 hover:bg-red-50'
            : 'border-cyan-200 text-cyan-700 hover:bg-cyan-50'
            }`}
    >
        {children}
    </button>
)

// Tracks an element's content-box width so the preview can scale to fit it.
const useContainerWidth = () => {
    const ref = useRef(null)
    const [width, setWidth] = useState(0)

    useLayoutEffect(() => {
        if (!ref.current) return
        const el = ref.current
        const update = () => setWidth(el.clientWidth)
        update()
        const observer = new ResizeObserver(update)
        observer.observe(el)
        return () => observer.disconnect()
    }, [])

    return [ref, width]
}

// ---- main component ----------------------------------------------------

export const ClientInvoice = () => {
    const [company, setCompany] = useState({
        name: 'iART Technologies Pvt. Ltd.',
        address:
            'Second Floor, Model Town Market, SCO - 13, Sector 126, Greater Mohali, Model Town, Sahibzada Ajit Singh Nagar, Punjab 140301',
        state: 'Haryana',
        code: '06',
        phone: '+91-9914851312',
        email: 'contact@iarttechnologies.com',
        gstin: '06AAICI8175R1ZN',
        cin: 'U62010HR2026PTC144294',
    })

    const [client, setClient] = useState({
        name: '',
        company: '',
        address: '',
        phone: '',
        email: '',
        gstin: '',
    })
    const [meta, setMeta] = useState({
        invoiceType: "INT",
        serviceType: "CS",
        serial: "01",          // Editable
        date: new Date().toISOString().slice(0, 10),
        dueDate: "",
    });

    const [items, setItems] = useState([{ id: uid(), description: '', qty: 1, rate: 0 }])

    // Flexible tax rows — add/remove freely, each with its own default % that can be edited.
    const [taxes, setTaxes] = useState([
        { id: uid(), label: 'CGST', rate: 9 },
        { id: uid(), label: 'SGST', rate: 9 },
    ])

    const [discount, setDiscount] = useState(0) // percentage, applied before tax
    const [notes, setNotes] = useState('Please mention the Invoice Number in the payment reference while making the transfer.')
    const [bank, setBank] = useState({
        paymentMode: "Bank Transfer (NEFT/RTGS/IMPS)",
        bankName: "Canara Bank",
        accountName: "iART Technologies Pvt. Ltd.",
        accountNumber: "120040025110",
        address: "Kaithal, Haryana, INDIA",
        swiftCode: "CNRBINBBBFD",
        ifsc: "CNRB0018278",
        paymentDue: "Within 15 days from the invoice date.",
    });
    const [generating, setGenerating] = useState(false)

    const previewRef = useRef(null)
    const [previewContainerRef, previewContainerWidth] = useContainerWidth()

    // Scale the true-size A4 pages down so the whole page width fits its column, with no scrollbar.
    const scale = previewContainerWidth > 0 ? Math.min(1, previewContainerWidth / A4_WIDTH) : 1

    // ---- generate invoice number ----
    const generateInvoiceNumber = (
        invoiceType,
        serviceType,
        date,
        serial
    ) => {
        const invoiceDate = new Date(date);

        const month = String(invoiceDate.getMonth() + 1).padStart(2, "0");
        const year = String(invoiceDate.getFullYear()).slice(-2);

        return `IART-${invoiceType}-${serviceType}-${month}${year}-${serial}`;
    };

    const invoiceNumber = useMemo(() => {
        return generateInvoiceNumber(
            meta.invoiceType,
            meta.serviceType,
            meta.date,
            meta.serial
        );
    }, [
        meta.invoiceType,
        meta.serviceType,
        meta.date,
        meta.serial,
    ]);

    const formatDate = (date) => {
        if (!date) return "";

        return new Date(date).toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
        });
    };

    // ---- item handlers ----
    const updateItem = (id, field, value) =>
        setItems((prev) => prev.map((it) => (it.id === id ? { ...it, [field]: value } : it)))
    const addItem = () => setItems((prev) => [...prev, { id: uid(), description: '', qty: 1, rate: 0 }])
    const removeItem = (id) => setItems((prev) => (prev.length > 1 ? prev.filter((it) => it.id !== id) : prev))

    // ---- tax handlers ----
    const updateTax = (id, field, value) =>
        setTaxes((prev) => prev.map((t) => (t.id === id ? { ...t, [field]: value } : t)))
    const addTax = () => setTaxes((prev) => [...prev, { id: uid(), label: 'Tax', rate: 0 }])
    const removeTax = (id) => setTaxes((prev) => prev.filter((t) => t.id !== id))

    // ---- computed totals ----
    const subtotal = useMemo(
        () => items.reduce((s, it) => s + (Number(it.qty) || 0) * (Number(it.rate) || 0), 0),
        [items]
    )
    const discountAmount = useMemo(() => (subtotal * (Number(discount) || 0)) / 100, [subtotal, discount])
    const taxableAmount = subtotal - discountAmount
    const taxLines = useMemo(
        () => taxes.map((t) => ({ ...t, amount: (taxableAmount * (Number(t.rate) || 0)) / 100 })),
        [taxes, taxableAmount]
    )
    const totalTax = taxLines.reduce((s, t) => s + t.amount, 0)
    const grandTotal = taxableAmount + totalTax

    // ---- pagination for preview + PDF ----
    const pages = useMemo(() => {
        const chunks = []
        for (let i = 0; i < items.length; i += ITEMS_PER_PAGE) chunks.push(items.slice(i, i + ITEMS_PER_PAGE))
        if (chunks.length === 0) chunks.push([])
        return chunks
    }, [items])

    const handleGeneratePDF = async () => {
        if (!previewRef.current) return
        setGenerating(true)
        try {
            // previewRef only points at the FIRST page's true-size wrapper. Query the
            // whole preview container so every page gets captured, not just page one.
            const container = previewRef.current.closest('[data-invoice-pages]') || previewRef.current.parentElement.parentElement
            const pageNodes = container.querySelectorAll('.invoice-page')
            const pdf = new jsPDF({ unit: 'px', format: [A4_WIDTH, A4_HEIGHT], orientation: 'portrait' })

            for (let i = 0; i < pageNodes.length; i++) {
                // Capture at true A4 size regardless of on-screen scale, so the PDF is always full quality.
                const canvas = await html2canvas(pageNodes[i], {
                    scale: 2,
                    useCORS: true,
                    backgroundColor: '#ffffff',
                    scrollX: 0,
                    scrollY: 0,
                    width: A4_WIDTH,
                    height: A4_HEIGHT,
                    windowWidth: A4_WIDTH,
                    windowHeight: A4_HEIGHT,
                })
                const imgData = canvas.toDataURL('image/png')
                if (i > 0) pdf.addPage([A4_WIDTH, A4_HEIGHT], 'portrait')
                pdf.addImage(imgData, 'PNG', 0, 0, A4_WIDTH, A4_HEIGHT)
            }

            pdf.save(`Invoice-${invoiceNumber}.pdf`)
        } catch (err) {
            console.error('PDF generation failed:', err)
            alert('Could not generate the PDF. Please check the console for details and try again.')
        } finally {
            setGenerating(false)
        }
    }

    return (
        <div className="p-4 sm:p-6 space-y-6 bg-[#F3F8FB] min-h-screen max-w-full overflow-x-hidden">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <h1 className="text-xl sm:text-2xl font-semibold text-gray-800">Client Invoice</h1>
                <button
                    type="button"
                    onClick={handleGeneratePDF}
                    disabled={generating}
                    className="inline-flex items-center gap-2 rounded-lg bg-cyan-700 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-cyan-800 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                >
                    {generating ? 'Generating…' : 'Generate PDF'}
                </button>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,700px)_1fr] gap-6 items-start">
                {/* ============================ FORM (scrolls) ============================ */}
                <div className="space-y-5 xl:max-h-[calc(100vh-140px)] xl:overflow-y-auto xl:pr-2 xl:-mr-2">
                    <Section title="From">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <Field
                                label="Company name"
                                className="sm:col-span-2"
                                value={company.name}
                                onChange={(e) => setCompany({ ...company, name: e.target.value })}
                            />
                            <Field
                                label="Address"
                                className="sm:col-span-2"
                                value={company.address}
                                onChange={(e) => setCompany({ ...company, address: e.target.value })}
                            />
                            <Field
                                label="State"
                                value={company.state}
                                onChange={(e) => setCompany({ ...company, state: e.target.value })}
                            />
                            <Field
                                label="Code"
                                value={company.code}
                                onChange={(e) => setCompany({ ...company, code: e.target.value })}
                            />
                            <Field
                                label="Phone"
                                value={company.phone}
                                onChange={(e) => setCompany({ ...company, phone: e.target.value })}
                            />
                            <Field
                                label="Email"
                                value={company.email}
                                onChange={(e) => setCompany({ ...company, email: e.target.value })}
                            />
                            <Field
                                label="CIN"
                                // className="sm:col-span-2"
                                value={company.cin}
                                onChange={(e) => setCompany({ ...company, cin: e.target.value })}
                            />
                            <Field
                                label="GSTIN"
                                // className="sm:col-span-2"
                                value={company.gstin}
                                onChange={(e) => setCompany({ ...company, gstin: e.target.value })}
                            />
                        </div>
                    </Section>

                    <Section title="Bill To">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <Field
                                label="Client name"
                                value={client.name}
                                onChange={(e) => setClient({ ...client, name: e.target.value })}
                            />
                            <Field
                                label="Client company"
                                value={client.company}
                                onChange={(e) => setClient({ ...client, company: e.target.value })}
                            />
                            <Field
                                label="Address"
                                className="sm:col-span-2"
                                value={client.address}
                                onChange={(e) => setClient({ ...client, address: e.target.value })}
                            />
                            <Field
                                label="Phone"
                                value={client.phone}
                                onChange={(e) => setClient({ ...client, phone: e.target.value })}
                            />
                            <Field
                                label="Email"
                                value={client.email}
                                onChange={(e) => setClient({ ...client, email: e.target.value })}
                            />
                            <Field
                                label="GSTIN"
                                className="sm:col-span-2"
                                value={client.gstin}
                                onChange={(e) => setClient({ ...client, gstin: e.target.value })}
                            />
                        </div>
                    </Section>

                    <Section title="Invoice details">
                        <div className="grid grid-cols-1 sm:grid-cols-1 gap-3">

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                {/* Invoice Type */}
                                <label>
                                    <span className="block text-xs font-medium text-gray-500 mb-1">
                                        Invoice Type
                                    </span>

                                    <select
                                        value={meta.invoiceType}
                                        onChange={(e) => {
                                            const invoiceType = e.target.value;

                                            setMeta((prev) => ({
                                                ...prev,
                                                invoiceType,
                                            }));
                                        }}
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                                    >
                                        <option value="INT">
                                            INT - International Invoice
                                        </option>

                                        <option value="DOM">
                                            DOM - Domestic Invoice
                                        </option>
                                    </select>
                                </label>

                                {/* Service Type */}
                                <label>
                                    <span className="block text-xs font-medium text-gray-500 mb-1">
                                        Service
                                    </span>

                                    <select
                                        value={meta.serviceType}
                                        onChange={(e) => {
                                            const serviceType = e.target.value;

                                            setMeta((prev) => ({
                                                ...prev,
                                                serviceType,

                                            }));
                                        }}
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                                    >
                                        <option value="CS">
                                            CS - Consultancy Services
                                        </option>

                                        <option value="DS">
                                            DS - DigiShop
                                        </option>
                                    </select>
                                </label>


                                <Field
                                    label="Serial"
                                    value={meta.serial}
                                    onChange={(e) =>
                                        setMeta({
                                            ...meta,
                                            serial: e.target.value.replace(/\D/g, ""),
                                        })
                                    }
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">

                                {/* Invoice Number */}
                                {/* <div className="grid grid-cols-2 gap-3"> */}

                                <Field
                                    label="Invoice Prefix"
                                    value={`IART-${meta.invoiceType}-${meta.serviceType}-${new Date(meta.date)
                                        .toLocaleDateString("en-GB", {
                                            month: "2-digit",
                                            year: "2-digit",
                                        })
                                        .replace("/", "")}-`}
                                    readOnly
                                />

                                {/* </div> */}

                                {/* Invoice Date */}
                                <Field
                                    label="Date"
                                    type="date"
                                    value={(meta.date)}
                                    onChange={(e) =>
                                        setMeta({
                                            ...meta,
                                            date: e.target.value,
                                        })
                                    }
                                />

                                {/* Due Date */}
                                <Field
                                    label="Due Date"
                                    type="date"
                                    value={(meta.dueDate)}
                                    onChange={(e) =>
                                        setMeta({
                                            ...meta,
                                            dueDate: e.target.value,
                                        })
                                    }
                                />
                            </div>

                        </div>
                    </Section>

                    <Section
                        title="Items"
                        action={
                            <button
                                type="button"
                                onClick={addItem}
                                className="text-xs font-medium text-cyan-700 hover:text-cyan-800"
                            >
                                + Add item
                            </button>
                        }
                    >
                        <div className="space-y-2">
                            {items.map((it) => (
                                <div key={it.id} className="flex gap-2 items-start">
                                    <Field
                                        className="flex-1"
                                        placeholder="Description"
                                        value={it.description}
                                        onChange={(e) => updateItem(it.id, 'description', e.target.value)}
                                    />
                                    <Field
                                        className="w-16"
                                        type="number"
                                        min="0"
                                        placeholder="Qty"
                                        value={it.qty}
                                        onChange={(e) => updateItem(it.id, 'qty', e.target.value)}
                                    />
                                    <Field
                                        className="w-24"
                                        type="number"
                                        min="0"
                                        placeholder="Rate"
                                        value={it.rate}
                                        onChange={(e) => updateItem(it.id, 'rate', e.target.value)}
                                    />
                                    <IconBtn danger title="Remove item" onClick={() => removeItem(it.id)}>
                                        ✕
                                    </IconBtn>
                                </div>
                            ))}
                        </div>
                    </Section>

                    <Section
                        title="Taxes"
                        action={
                            <button
                                type="button"
                                onClick={addTax}
                                className="text-xs font-medium text-cyan-700 hover:text-cyan-800"
                            >
                                + Add tax
                            </button>
                        }
                    >
                        <div className="space-y-2">
                            {taxes.map((t) => (
                                <div key={t.id} className="flex gap-2 items-start">
                                    <Field
                                        className="flex-1"
                                        placeholder="Label (e.g. CGST)"
                                        value={t.label}
                                        onChange={(e) => updateTax(t.id, 'label', e.target.value)}
                                    />
                                    <div className="relative w-24">
                                        <Field
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={t.rate}
                                            onChange={(e) => updateTax(t.id, 'rate', e.target.value)}
                                        />
                                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                                            %
                                        </span>
                                    </div>
                                    <IconBtn danger title="Remove tax" onClick={() => removeTax(t.id)}>
                                        ✕
                                    </IconBtn>
                                </div>
                            ))}
                            {taxes.length === 0 && (
                                <p className="text-xs text-gray-400">No taxes added — invoice will show the subtotal as the total.</p>
                            )}
                        </div>

                        <div className="pt-2 border-t border-gray-100">
                            <div className="relative w-32">
                                <Field
                                    label="Discount"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={discount}
                                    onChange={(e) => setDiscount(e.target.value)}
                                />
                                <span className="pointer-events-none absolute right-3 top-[30px] text-xs text-gray-400">%</span>
                            </div>
                        </div>
                    </Section>

                    <Section title="Notes & payment">
                        <TextArea
                            label="Notes / terms"
                            rows={3}
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                        />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                            <Field
                                label="Payment Mode"
                                value={bank.paymentMode}
                                onChange={(e) => setBank({ ...bank, paymentMode: e.target.value })}
                            />
                            <Field
                                label="Bank name"
                                value={bank.bankName}
                                onChange={(e) => setBank({ ...bank, bankName: e.target.value })}
                            />
                            <Field
                                label="Account name"
                                value={bank.accountName}
                                onChange={(e) => setBank({ ...bank, accountName: e.target.value })}
                            />
                            <Field
                                label="Account number"
                                value={bank.accountNumber}
                                onChange={(e) => setBank({ ...bank, accountNumber: e.target.value })}
                            />
                            <Field
                                label="Address"
                                value={bank.address}
                                onChange={(e) =>
                                    setBank({ ...bank, address: e.target.value })
                                }
                            />
                            <Field
                                label="Swift Code"
                                value={bank.swiftCode}
                                onChange={(e) =>
                                    setBank({ ...bank, swiftCode: e.target.value })
                                }
                            />
                            <Field
                                label="IFSC"
                                value={bank.ifsc}
                                onChange={(e) => setBank({ ...bank, ifsc: e.target.value })}
                            />
                            <Field
                                label="Payment Due"
                                value={bank.paymentDue}
                                onChange={(e) =>
                                    setBank({ ...bank, paymentDue: e.target.value })
                                }
                            />
                        </div>
                    </Section>
                </div>

                {/* ============================ PREVIEW (pinned, scales to fit — never scrolls) ============================ */}
                <div ref={previewContainerRef} className="xl:sticky xl:top-6 w-full">
                    <div data-invoice-pages className="flex flex-col items-center gap-6">
                        {pages.map((pageItems, pageIndex) => (
                            // Outer box reserves the *scaled* footprint so pages stack without gaps/overlap.
                            <div
                                key={pageIndex}
                                style={{
                                    width: A4_WIDTH * scale,
                                    height: A4_HEIGHT * scale,
                                }}
                            >
                                <div
                                    ref={pageIndex === 0 ? previewRef : undefined}
                                    style={{
                                        width: A4_WIDTH,
                                        height: A4_HEIGHT,
                                        transform: `scale(${scale})`,
                                        transformOrigin: 'top left',
                                    }}
                                >
                                    <InvoicePage
                                        company={company}
                                        client={client}
                                        meta={meta}
                                        invoiceNumber={invoiceNumber}
                                        pageItems={pageItems}
                                        pageIndex={pageIndex}
                                        pageCount={pages.length}
                                        isLastPage={pageIndex === pages.length - 1}
                                        subtotal={subtotal}
                                        discount={discount}
                                        discountAmount={discountAmount}
                                        taxLines={taxLines}
                                        grandTotal={grandTotal}
                                        notes={notes}
                                        bank={bank}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}

// ---- preview page (also what gets captured into the PDF) --------------
//
// Everything in here is styled with plain `style={{ ... }}` objects using hex/rgb
// colors only. Do NOT reintroduce Tailwind utility classes on elements inside this
// component — Tailwind's generated palette can resolve to oklch() colors, which
// html2canvas cannot parse and will throw on ("unsupported color function oklch").

const FONT_STACK = "'Roboto', 'Helvetica Neue', Arial, sans-serif"

const InvoicePage = ({
    company,
    client,
    meta,
    invoiceNumber,
    pageItems,
    pageIndex,
    pageCount,
    isLastPage,
    subtotal,
    discount,
    discountAmount,
    taxLines,
    grandTotal,
    notes,
    bank,
}) => {
    const startNumber = pageIndex * ITEMS_PER_PAGE

    return (
        <div
            className="invoice-page"
            style={{
                width: A4_WIDTH,
                height: A4_HEIGHT,
                padding: '40px 44px',
                background: '#ffffff',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                fontFamily: FONT_STACK,
                color: INK,
                boxSizing: 'border-box',
            }}
        >
            {/* header — full detail only on page 1 */}
            {pageIndex === 0 ? (
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'space-between',
                        paddingBottom: 20,
                        borderBottom: `2px solid ${ACCENT}`,
                    }}
                >
                    <div>
                        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: ACCENT }}>
                            {company.name || 'Your Company'}
                        </h2>
                        {company.address && (
                            <p style={{ margin: '6px 0 0', fontSize: 9, color: INK_LIGHT, maxWidth: 230, lineHeight: 1.5 }}>
                                {company.address}
                            </p>
                        )}
                        {company.cin && (
                            <p style={{ margin: '4px 0 0', fontSize: 9, color: INK_LIGHT }}>CIN: {company.cin}</p>
                        )}
                        {company.gstin && (
                            <p style={{ margin: '4px 0 0', fontSize: 9, color: INK_LIGHT }}>GSTIN: {company.gstin}</p>
                        )}
                        {(company.state || company.code) && (
                            <p style={{ margin: '4px 0 0', fontSize: 9, color: INK_LIGHT }}>State Name: {company.state}, Code: {company.code}</p>
                        )}
                        {(company.phone || company.email) && (
                            <p style={{ margin: '4px 0 0', fontSize: 9, color: INK_LIGHT }}>
                                {[company.phone, company.email].filter(Boolean).join('  |  ')}
                            </p>
                        )}
                    </div>
                    <div
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "flex-end",
                            gap: 10,
                        }}
                    >
                        <img
                            src={iArtLogo}
                            alt="iART Technologies"
                            style={{
                                width: 150,
                                height: "auto",
                                objectFit: "contain",
                            }}
                        />
                    </div>
                </div>
            ) : (
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingBottom: 14,
                        borderBottom: `1px solid ${BORDER}`,
                    }}
                >
                    <h2 style={{ margin: 0, fontSize: 12, fontWeight: 600, color: INK_LIGHT }}>
                        Invoice {invoiceNumber} — {company.name}
                    </h2>
                    <span style={{ fontSize: 10, color: '#9AA4B2' }}>continued</span>
                </div>
            )}

            {/* bill-to / invoice-details boxes — page 1 only, styled like the xlsx template */}
            {pageIndex === 0 && (
                <div style={{ display: 'flex', gap: 16, marginTop: 20, marginBottom: 20 }}>
                    <div style={{ flex: 1, border: `1px solid ${BORDER}`, borderRadius: 4, padding: '10px 14px' }}>
                        <p
                            style={{
                                margin: '0 0 8px',
                                fontSize: 9.5,
                                fontWeight: 700,
                                color: ACCENT,
                                textTransform: 'uppercase',
                                letterSpacing: 0.5,
                            }}
                        >
                            Bill To
                        </p>
                        <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: INK }}>{client.name || 'Client name'}</p>
                        {client.company && <p style={{ margin: '2px 0 0', fontSize: 9.5, color: INK_LIGHT }}>{client.company}</p>}
                        {client.address && <p style={{ margin: '2px 0 0', fontSize: 9.5, color: INK_LIGHT }}>{client.address}</p>}
                        {(client.phone || client.email) && (
                            <p style={{ margin: '2px 0 0', fontSize: 9.5, color: INK_LIGHT }}>
                                {[client.phone, client.email].filter(Boolean).join('  |  ')}
                            </p>
                        )}
                        {client.gstin && <p style={{ margin: '2px 0 0', fontSize: 9.5, color: INK_LIGHT }}>GSTIN: {client.gstin}</p>}
                    </div>
                    <div style={{ flex: 1, border: `1px solid ${BORDER}`, borderRadius: 4, padding: '10px 14px' }}>
                        <p
                            style={{
                                margin: '0 0 8px',
                                fontSize: 9.5,
                                fontWeight: 700,
                                color: ACCENT,
                                textTransform: 'uppercase',
                                letterSpacing: 0.5,
                            }}
                        >
                            Invoice Details
                        </p>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9.5, marginTop: 4 }}>
                            <span style={{ color: INK_LIGHT }}>Invoice No.</span>
                            <span style={{ color: INK, fontWeight: 600 }}>{invoiceNumber}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9.5, marginTop: 4 }}>
                            <span style={{ color: INK_LIGHT }}>Invoice Date</span>
                            <span style={{ color: INK }}>{formatDate(meta.date)}</span>
                        </div>
                        {meta.dueDate && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9.5, marginTop: 4 }}>
                                <span style={{ color: INK_LIGHT }}>Due Date</span>
                                <span style={{ color: INK }}>{formatDate(meta.dueDate)}</span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* items table */}
            <table style={{ width: '100%', fontSize: 10, borderCollapse: 'collapse', marginTop: pageIndex === 0 ? 0 : 16 }}>
                <thead>
                    <tr style={{ backgroundColor: ACCENT }}>
                        <th style={thStyle('40px', 'left')}></th>
                        <th style={thStyle('auto', 'left')}>Description</th>
                        <th style={thStyle('56px', 'right')}>HSN/SAC</th>
                        <th style={thStyle('96px', 'right')}>Unit Price</th>
                        <th style={thStyle('112px', 'right')}>Total</th>
                    </tr>
                </thead>
                <tbody>
                    {pageItems.map((it, i) => (
                        <tr key={it.id} style={{ borderBottom: `1px solid ${BORDER}` }}>
                            <td style={tdStyle('left', INK_LIGHT)}>{startNumber + i + 1}</td>
                            <td style={tdStyle('left', INK)}>{it.description || '—'}</td>
                            <td style={tdStyle('right', INK)}>{Number(it.qty) || 0}</td>
                            <td style={tdStyle('right', INK)}>{money(it.rate)}</td>
                            <td style={{ ...tdStyle('right', INK), fontWeight: 600 }}>
                                {money((Number(it.qty) || 0) * (Number(it.rate) || 0))}
                            </td>
                        </tr>
                    ))}
                    {pageItems.length === 0 && (
                        <tr>
                            <td colSpan={5} style={{ padding: '24px 12px', textAlign: 'center', fontSize: 10, color: '#9AA4B2' }}>
                                No items added yet
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>

            {/* totals + thank-you note — last page only, mirrors the xlsx SUBTOTAL/TAX/Balance Due block */}
            {isLastPage && (
                <div style={{ marginTop: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <p style={{ margin: 0, fontSize: 11, fontStyle: 'italic', color: INK_LIGHT, maxWidth: 260 }}>
                        Thank you for your business!
                    </p>
                    <div style={{ width: 260 }}>
                        <TotalRow label="Subtotal" value={money(subtotal)} />
                        {Number(discount) > 0 && (
                            <TotalRow label={`Discount (${discount}%)`} value={`-${money(discountAmount)}`} />
                        )}
                        {taxLines.map((t) => (
                            <TotalRow key={t.id} label={`${t.label || 'Tax'} (${t.rate}%)`} value={money(t.amount)} />
                        ))}
                        <div
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginTop: 8,
                                paddingTop: 8,
                                borderTop: `2px solid ${ACCENT}`,
                            }}
                        >
                            <span style={{ fontSize: 12, fontWeight: 700, color: ACCENT_DARK }}>Balance Due</span>
                            <span
                                style={{
                                    fontSize: 13,
                                    fontWeight: 700,
                                    color: INK,
                                    padding: '4px 12px',
                                    borderRadius: 3,
                                }}
                            >
                                {money(grandTotal)}
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {/* Terms & Instructions — last page only, mirrors the xlsx footer block */}
            {isLastPage && (notes || bank.bankName || bank.accountNumber) && (
                <div style={{ marginTop: 28, paddingTop: 14, borderTop: `1px solid ${BORDER}` }}>
                    <p
                        style={{
                            margin: '0 0 8px',
                            fontSize: 10,
                            fontWeight: 700,
                            color: ACCENT,
                            textTransform: 'uppercase',
                            letterSpacing: 0.5,
                        }}
                    >
                        Terms & Instructions
                    </p>
                    <div>
                        {(bank.bankName || bank.accountNumber) && (
                            <div style={{ flex: 1 }}>
                                <p style={{ margin: 0, fontSize: 9, lineHeight: 1.8 }}>
                                    <strong>Payment Mode:</strong> {bank.paymentMode}
                                </p>

                                <p style={{ margin: 0, fontSize: 9, lineHeight: 1.8 }}>
                                    <strong>Bank Name:</strong> {bank.bankName}
                                    {"  "}
                                    <strong>Account Name:</strong> {bank.accountName}
                                </p>

                                <p style={{ margin: 0, fontSize: 9, lineHeight: 1.8 }}>
                                    <strong>A/C :</strong> {bank.accountNumber}
                                    {" | "}
                                    <strong>Address:</strong> {bank.address}
                                    {" | "}
                                    <strong>Swift Code:</strong> {bank.swiftCode}
                                    {" | "}
                                    <strong>IFSC:</strong> {bank.ifsc}
                                </p>

                                <p style={{ margin: 0, fontSize: 9, lineHeight: 1.8 }}>
                                    <strong>Payment Due.</strong> {bank.paymentDue}
                                </p>
                            </div>
                        )}
                        {notes && (
                            <div style={{ flex: 1 }}>
                                <p style={{ margin: 0, fontSize: 9, lineHeight: 1.8 }}>
                                    <strong>Note:</strong>  {notes}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* footer / page number */}
            <div
                style={{
                    marginTop: 'auto',
                    paddingTop: 16,
                    display: 'flex',
                    justifyContent: 'end',
                    alignItems: 'flex-end',
                }}
            >
                <span style={{ fontSize: 8, color: INK_LIGHT }}>
                    Page {pageIndex + 1} of {pageCount}
                </span>
            </div>
        </div>
    )
}

// small style helpers for the items table (kept out of JSX for readability)
const thStyle = (width, align) => ({
    width,
    textAlign: align,
    color: '#ffffff',
    fontSize: 9.5,
    fontWeight: 700,
    padding: '8px 10px',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
})

const tdStyle = (align, color) => ({
    textAlign: align,
    color,
    padding: '7px 10px',
})

const TotalRow = ({ label, value }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontSize: 10.5 }}>
        <span style={{ color: INK_LIGHT }}>{label}</span>
        <span style={{ color: INK, fontWeight: 500 }}>{value}</span>
    </div>
)

export default ClientInvoice