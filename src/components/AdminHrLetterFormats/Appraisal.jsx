import React, { useRef, useState } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { Download, FileText, Loader2 } from "lucide-react";

import { getPhoneBook, assignLetter } from "../../api/authApi";
import iArtLogo from "../../assets/logoiart.svg";

export const Appraisal = () => {
    const letterRef = useRef(null);

    // =========================================================
    // EMPLOYEE
    // =========================================================

    const [users, setUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [usersLoading, setUsersLoading] = useState(false);
    const [usersLoaded, setUsersLoaded] = useState(false);

    const [employeeNameUserId, setEmployeeNameUserId] = useState("");

    // =========================================================
    // DOWNLOAD STATES
    // =========================================================

    const [pdfLoading, setPdfLoading] = useState(false);
    const [docLoading, setDocLoading] = useState(false);

    // =========================================================
    // SIGNATURE
    // =========================================================

    const [signature, setSignature] = useState(null);

    const handleSignatureUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith("image/")) {
            alert("Please upload an image file (PNG, JPG, etc.) for the signature.");
            return;
        }

        const reader = new FileReader();
        reader.onload = () => setSignature(reader.result);
        reader.readAsDataURL(file);
    };

    const removeSignature = () => setSignature(null);

    // =========================================================
    // FORM DATA
    // Matches LetterFormat-Appraisal.pdf
    // =========================================================

    const [formData, setFormData] = useState({
        candidateName: "",
        designation: "",
        department: "",
        employeeId: "",

        existingMonthlySalary: "",
        revisedMonthlySalary: "",


        effectiveDate: "",
    });

    // =========================================================
    // INPUT CHANGE
    // =========================================================

    const handleChange = (e) => {
        const { name, value } = e.target;

        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    // =========================================================
    // DATE FORMAT
    // =========================================================

    const formatDate = (date) => {
        if (!date) return "DD/MM/YYYY";

        const d = new Date(date);

        if (Number.isNaN(d.getTime())) {
            return date;
        }

        return d.toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
        });;
    };

    // =========================================================
    // CURRENCY
    // =========================================================

    const formatCurrency = (amount) => {
        if (amount === "" || amount === null || amount === undefined) {
            return "0";
        }

        const number = Number(amount);

        if (Number.isNaN(number)) {
            return amount;
        }

        return number.toLocaleString("en-IN");
    };

    // =========================================================
    // AUTO CALCULATIONS
    // Existing/Revised Annual CTC = Monthly Gross Salary × 12
    // Appraisal/Increment = ((Revised - Existing) / Existing) × 100
    // =========================================================

    const existingMonthly = Number(formData.existingMonthlySalary) || 0;
    const revisedMonthly = Number(formData.revisedMonthlySalary) || 0;

    const existingAnnualCTC = existingMonthly > 0
        ? existingMonthly * 12
        : 0;

    const revisedAnnualCTC = revisedMonthly > 0
        ? revisedMonthly * 12
        : 0;

    const appraisalPercentage = existingMonthly > 0
        ? ((revisedMonthly - existingMonthly) / existingMonthly) * 100
        : 0;

    // =========================================================
    // LOAD PHONEBOOK
    // =========================================================

    const loadPhoneBookUsers = async () => {
        if (usersLoaded || usersLoading) return;

        try {
            setUsersLoading(true);

            const response = await getPhoneBook({
                page: 1,
                limit: 100,
                search: "",
            });

            if (response?.success) {
                setUsers(response.users || []);
                setUsersLoaded(true);
            } else {
                setUsers([]);
            }
        } catch (error) {
            console.error("Phonebook loading error:", error);
            setUsers([]);
        } finally {
            setUsersLoading(false);
        }
    };

    // =========================================================
    // SELECT EMPLOYEE
    // =========================================================

    const handleEmployeeNameSelect = (e) => {
        const userId = e.target.value;

        setEmployeeNameUserId(userId);

        if (!userId) {
            setFormData((prev) => ({
                ...prev,
                candidateName: "",
                employeeId: "",
                designation: "",
                department: "",
            }));
            return;
        }

        const employee = users.find(
            (user) => user._id === userId
        );

        if (!employee) return;

        setFormData((prev) => ({
            ...prev,

            candidateName:
                employee.fullName ||
                employee.name ||
                "",

            employeeId:
                employee.employeeId ||
                employee.employeeCode ||
                employee.empId ||
                employee.id ||
                employee._id ||
                "",

            designation:
                employee.designation ||
                "",

            department:
                employee.department ||
                "",
        }));

        // IMPORTANT:
        // Do NOT setSelectedUser(employee)
        //
        // This dropdown only fills the form.
    };

    const handleUserSelect = (e) => {
        const userId = e.target.value;

        if (!userId) {
            setSelectedUser(null);
            return;
        }

        const employee = users.find(
            (user) => user._id === userId
        );

        if (!employee) return;

        // This selector controls assignment.
        setSelectedUser(employee);

        setFormData((prev) => ({
            ...prev,

            candidateName:
                employee.fullName ||
                employee.name ||
                prev.candidateName,

            employeeId:
                employee.employeeId ||
                employee.employeeCode ||
                employee.empId ||
                employee.id ||
                employee._id ||
                prev.employeeId,

            designation:
                employee.designation ||
                prev.designation,

            department:
                employee.department ||
                prev.department,
        }));

        // Keep the form Employee Name dropdown synchronized visually.
        setEmployeeNameUserId(employee._id);
    };

    // =========================================================
    // FILE NAME
    // =========================================================

    const getFileName = (extension) => {
        const candidate =
            formData.candidateName?.trim() || "Candidate";

        const safeName = candidate
            .replace(/[^a-zA-Z0-9 ]/g, "")
            .replace(/\s+/g, "_");

        return `Appraisal_Letter_${safeName}.${extension}`;
    };

    // =========================================================
    // DOC DOWNLOAD
    //
    // Same behavior as Appointment:
    // DOC downloads only.
    // Assignment is done only from PDF Print.
    // =========================================================

    const handleDocPrint = async () => {
        if (!letterRef.current || docLoading) return;

        try {
            setDocLoading(true);

            const letterHTML = letterRef.current.innerHTML;

            const documentHTML = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <style>
                        @page {
                            size: A4;
                            margin: 20mm;
                        }

                        body {
                            font-family: Arial, Helvetica, sans-serif;
                            color: #111111;
                            line-height: 1.4;
                            font-size: 10pt;
                            margin: 0;
                        }

                        p {
                            margin: 0 0 10px 0;
                        }

                        table {
                            width: 100%;
                            border-collapse: collapse;
                        }

                        td,
                        th {
                            border: 1px solid #222;
                            padding: 7px;
                            text-align: left;
                        }

                        th {
                            font-weight: 700;
                        }

                        img {
                            max-width: 100%;
                        }
                    </style>
                </head>
                <body>
                    ${letterHTML}
                </body>
                </html>
            `;

            const blob = new Blob(
                ["\ufeff", documentHTML],
                { type: "application/msword" }
            );

            const url = URL.createObjectURL(blob);
            const anchor = document.createElement("a");

            anchor.href = url;
            anchor.download = getFileName("doc");

            document.body.appendChild(anchor);
            anchor.click();
            document.body.removeChild(anchor);

            URL.revokeObjectURL(url);
        } catch (error) {
            console.error("DOC generation error:", error);
            alert("Failed to generate DOC file.");
        } finally {
            setDocLoading(false);
        }
    };

    // =========================================================
    // WAIT FOR IMAGES
    // =========================================================

    const waitForImages = async (root) => {
        const images = Array.from(root.querySelectorAll("img"));

        await Promise.all(
            images.map((img) => {
                if (img.complete) return Promise.resolve();

                return new Promise((resolve) => {
                    img.onload = resolve;
                    img.onerror = resolve;
                });
            })
        );
    };

    // =========================================================
    // GENERATE PDF
    //
    // Creates separate A4 DOM pages before html2canvas capture.
    // This prevents text from being cut at page boundaries.
    // =========================================================

    const generatePdfBlob = async () => {
        if (!letterRef.current) {
            throw new Error("Appraisal letter preview not found.");
        }

        const source = letterRef.current;

        // A4 at 96 dpi
        const PAGE_WIDTH_PX = 794;
        const PAGE_HEIGHT_PX = 1123;

        // Slightly tighter padding so content + signature fit on one page
        const PAGE_PADDING_TOP = 48;
        const PAGE_PADDING_RIGHT = 56;
        const PAGE_PADDING_BOTTOM = 44;
        const PAGE_PADDING_LEFT = 56;

        if (document.fonts?.ready) {
            await document.fonts.ready;
        }

        await waitForImages(source);

        // Measure the real content height of the preview
        const contentHeight = source.scrollHeight;

        // If everything fits on one A4 page → capture as a single page
        // This is the normal case for Appraisal letters.
        if (contentHeight <= PAGE_HEIGHT_PX + 20) {
            const canvas = await html2canvas(source, {
                scale: 2.2,
                useCORS: true,
                allowTaint: false,
                backgroundColor: "#ffffff",
                logging: false,
                width: PAGE_WIDTH_PX,
                height: Math.max(contentHeight, PAGE_HEIGHT_PX),
                windowWidth: PAGE_WIDTH_PX,
                scrollX: 0,
                scrollY: 0,
            });

            const imgData = canvas.toDataURL("image/jpeg", 0.96);
            const pdf = new jsPDF("p", "mm", "a4");
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();

            // Fit the captured image into one A4 page
            const imgWidth = pdfWidth;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;

            // If the image is slightly taller than A4 we scale it down a tiny bit
            // so it never creates a second page.
            if (imgHeight <= pdfHeight) {
                pdf.addImage(imgData, "JPEG", 0, 0, imgWidth, imgHeight, undefined, "FAST");
            } else {
                const scale = pdfHeight / imgHeight;
                pdf.addImage(
                    imgData,
                    "JPEG",
                    0,
                    0,
                    imgWidth * scale,
                    pdfHeight,
                    undefined,
                    "FAST"
                );
            }

            return pdf.output("blob");
        }

        // ---------- Fallback: multi-page only when content is truly long ----------
        const renderHost = document.createElement("div");
        Object.assign(renderHost.style, {
            position: "fixed",
            left: "-100000px",
            top: "0",
            width: `${PAGE_WIDTH_PX}px`,
            background: "#ffffff",
            pointerEvents: "none",
            zIndex: "-9999",
        });
        document.body.appendChild(renderHost);

        const pages = [];
        const createPage = () => {
            const page = document.createElement("div");
            Object.assign(page.style, {
                width: `${PAGE_WIDTH_PX}px`,
                height: `${PAGE_HEIGHT_PX}px`,
                boxSizing: "border-box",
                overflow: "hidden",
                padding: `${PAGE_PADDING_TOP}px ${PAGE_PADDING_RIGHT}px ${PAGE_PADDING_BOTTOM}px ${PAGE_PADDING_LEFT}px`,
                fontFamily: "Arial, Helvetica, sans-serif",
                fontSize: "12.5px",
                lineHeight: "1.4",
                backgroundColor: "#ffffff",
                color: "#111111",
            });
            renderHost.appendChild(page);
            pages.push(page);
            return page;
        };

        let currentPage = createPage();
        const overflows = (page) => page.scrollHeight > page.clientHeight + 1;

        const sourceChildren = Array.from(source.children);

        try {
            for (let index = 0; index < sourceChildren.length; index += 1) {
                const original = sourceChildren[index];
                const clone = original.cloneNode(true);

                clone.style.breakInside = "avoid";
                clone.style.pageBreakInside = "avoid";

                currentPage.appendChild(clone);

                if (overflows(currentPage) && currentPage.children.length > 1) {
                    currentPage.removeChild(clone);
                    currentPage = createPage();
                    currentPage.appendChild(clone);
                }
            }

            await waitForImages(renderHost);

            const pdf = new jsPDF("p", "mm", "a4");
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();

            for (let pageIndex = 0; pageIndex < pages.length; pageIndex += 1) {
                const page = pages[pageIndex];

                const canvas = await html2canvas(page, {
                    scale: 2.2,
                    useCORS: true,
                    allowTaint: false,
                    backgroundColor: "#ffffff",
                    logging: false,
                    width: PAGE_WIDTH_PX,
                    height: PAGE_HEIGHT_PX,
                    windowWidth: PAGE_WIDTH_PX,
                    windowHeight: PAGE_HEIGHT_PX,
                    scrollX: 0,
                    scrollY: 0,
                });

                const imgData = canvas.toDataURL("image/jpeg", 0.96);

                if (pageIndex > 0) pdf.addPage();

                pdf.addImage(
                    imgData,
                    "JPEG",
                    0,
                    0,
                    pdfWidth,
                    pdfHeight,
                    undefined,
                    "FAST"
                );
            }

            return pdf.output("blob");
        } finally {
            renderHost.remove();
        }
    };
    // =========================================================
    // PDF DOWNLOAD + ASSIGN
    //
    // Same behavior as Appointment:
    // 1. Generate PDF
    // 2. Download PDF
    // 3. If employee selected, assign the same PDF
    // 4. Assignment type = appraisal
    // =========================================================

    const handlePdfPrint = async () => {
        if (!letterRef.current || pdfLoading) return;

        try {
            setPdfLoading(true);

            const pdfBlob = await generatePdfBlob();
            const fileName = getFileName("pdf");

            const pdfFile = new File(
                [pdfBlob],
                fileName,
                { type: "application/pdf" }
            );

            // Download first.
            const url = URL.createObjectURL(pdfBlob);
            const anchor = document.createElement("a");

            anchor.href = url;
            anchor.download = fileName;

            document.body.appendChild(anchor);
            anchor.click();
            document.body.removeChild(anchor);

            URL.revokeObjectURL(url);

            // Assign only when an employee has been selected.
            if (selectedUser?._id) {
                const assignFormData = new FormData();

                assignFormData.append(
                    "userId",
                    selectedUser._id
                );

                assignFormData.append(
                    "type",
                    "appraisal"
                );

                assignFormData.append(
                    "file",
                    pdfFile
                );

                const response = await assignLetter(
                    assignFormData
                );

                if (!response?.success) {
                    console.error(
                        "Appraisal downloaded but assignment failed:",
                        response
                    );

                    alert(
                        response?.message ||
                        "PDF downloaded, but the appraisal letter could not be assigned."
                    );

                    return;
                }

                console.log(
                    "Appraisal letter assigned successfully."
                );
            }
        } catch (error) {
            console.error("PDF generation error:", error);

            alert(
                error?.message ||
                "Failed to generate appraisal PDF."
            );
        } finally {
            setPdfLoading(false);
        }
    };

    // =========================================================
    // JSX
    // =========================================================

    return (
        <div className="w-full h-full min-h-0 flex flex-col">

            {/* =====================================================
                TOP BAR
            ===================================================== */}

            <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4 shrink-0">
                <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4">

                    {/* EMPLOYEE DROPDOWN */}

                    <div className="w-full xl:max-w-md">
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                            Select Employee
                        </label>

                        <select
                            value={selectedUser?._id || ""}
                            onFocus={loadPhoneBookUsers}
                            onClick={loadPhoneBookUsers}
                            onChange={handleUserSelect}
                            className="
                                w-full
                                border
                                border-gray-300
                                rounded-lg
                                px-3
                                py-2.5
                                text-sm
                                bg-white
                                focus:outline-none
                                focus:ring-2
                                focus:ring-blue-500
                            "
                        >
                            <option value="">
                                {usersLoading
                                    ? "Loading employees..."
                                    : "Select employee (optional)"}
                            </option>

                            {users.map((user) => (
                                <option
                                    key={user._id}
                                    value={user._id}
                                >
                                    {user.fullName ||
                                        user.name ||
                                        "Unknown"}

                                    {user.designation
                                        ? ` - ${user.designation}`
                                        : ""}

                                    {user.email
                                        ? ` (${user.email})`
                                        : ""}
                                </option>
                            ))}
                        </select>

                        <p className="mt-1 text-xs text-gray-500">
                            Employee selection is optional. Assignment happens only when PDF Print is clicked.
                        </p>
                    </div>

                    {/* SIGNATURE UPLOAD */}

                    <div className="w-full xl:max-w-xs">
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                            Signature
                        </label>

                        {signature ? (
                            <div className="flex items-center gap-3">
                                <img
                                    src={signature}
                                    alt="Signature preview"
                                    className="h-11 object-contain border border-gray-200 rounded-lg p-1 bg-white"
                                />

                                <button
                                    type="button"
                                    onClick={removeSignature}
                                    className="text-xs font-medium text-red-500 hover:text-red-600"
                                >
                                    Remove
                                </button>
                            </div>
                        ) : (
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleSignatureUpload}
                                className="
                                    block
                                    w-full
                                    text-xs
                                    text-gray-600
                                    file:mr-3
                                    file:rounded-lg
                                    file:border
                                    file:border-gray-300
                                    file:bg-white
                                    file:px-3
                                    file:py-2
                                    file:text-xs
                                    file:font-medium
                                    file:text-gray-700
                                    hover:file:bg-gray-50
                                "
                            />
                        )}

                        <p className="mt-1 text-xs text-gray-500">
                            Appears below "Authorized Signatory".
                        </p>
                    </div>

                    {/* DOWNLOAD BUTTONS */}

                    <div className="flex gap-2">

                        <button
                            type="button"
                            onClick={handleDocPrint}
                            disabled={docLoading}
                            className="
                                inline-flex
                                items-center
                                justify-center
                                gap-2
                                rounded-lg
                                bg-gray-800
                                px-4
                                py-2.5
                                text-sm
                                font-medium
                                text-white
                                hover:bg-gray-900
                                disabled:opacity-60
                            "
                        >
                            {docLoading ? (
                                <Loader2
                                    size={17}
                                    className="animate-spin"
                                />
                            ) : (
                                <FileText size={17} />
                            )}

                            Doc Print
                        </button>

                        <button
                            type="button"
                            onClick={handlePdfPrint}
                            disabled={pdfLoading}
                            className="
                                inline-flex
                                items-center
                                justify-center
                                gap-2
                                rounded-lg
                                bg-blue-600
                                px-4
                                py-2.5
                                text-sm
                                font-medium
                                text-white
                                hover:bg-blue-700
                                disabled:opacity-60
                            "
                        >
                            {pdfLoading ? (
                                <Loader2
                                    size={17}
                                    className="animate-spin"
                                />
                            ) : (
                                <Download size={17} />
                            )}

                            PDF Print
                        </button>
                    </div>
                </div>

                {selectedUser && (
                    <div className="
                        mt-3
                        rounded-lg
                        bg-blue-50
                        border
                        border-blue-100
                        px-3
                        py-2
                        text-sm
                        text-blue-800
                    ">
                        Appraisal letter will be assigned to{" "}
                        <span className="font-semibold">
                            {selectedUser.fullName ||
                                selectedUser.name}
                        </span>{" "}
                        when PDF Print is clicked.
                    </div>
                )}
            </div>

            {/* =====================================================
                FORM + PREVIEW
            ===================================================== */}

            <div
                className="
                    flex-1
                    min-h-0
                    grid
                    grid-cols-1
                    xl:grid-cols-2
                    gap-4
                    overflow-hidden
                "
            >

                {/* =================================================
                    LEFT SIDE - FORM
                ================================================= */}

                <div
                    className="
                        min-h-0
                        overflow-y-auto
                        overflow-x-hidden
                        pr-1
                    "
                >
                    <div className="
                        bg-white
                        border
                        border-gray-200
                        rounded-xl
                        p-4
                        mb-4
                    ">
                        <h2 className="
                            text-base
                            font-semibold
                            text-gray-800
                            mb-4
                        ">
                            Appraisal Letter Details
                        </h2>

                        <div className="
                            grid
                            grid-cols-1
                            md:grid-cols-2
                            gap-4
                        ">

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Employee Name
                                </label>

                                <select
                                    value={employeeNameUserId}
                                    onFocus={loadPhoneBookUsers}
                                    onClick={loadPhoneBookUsers}
                                    onChange={handleEmployeeNameSelect}
                                    className="
            w-full
            rounded-lg
            border
            border-gray-300
            px-3
            py-2
            text-sm
            bg-white
            focus:outline-none
            focus:ring-2
            focus:ring-blue-500
        "
                                >
                                    <option value="">
                                        {usersLoading
                                            ? "Loading employees..."
                                            : "Select employee"}
                                    </option>

                                    {users.map((user) => (
                                        <option
                                            key={user._id}
                                            value={user._id}
                                        >
                                            {user.fullName ||
                                                user.name ||
                                                "Unknown"}

                                            {user.designation
                                                ? ` - ${user.designation}`
                                                : ""}

                                            {user.email
                                                ? ` (${user.email})`
                                                : ""}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <Input
                                label="Employee ID"
                                name="employeeId"
                                value={formData.employeeId}
                                onChange={handleChange}
                                placeholder="Employee ID"
                            />

                            <Input
                                label="Designation"
                                name="designation"
                                value={formData.designation}
                                onChange={handleChange}
                                placeholder="Software Developer"
                            />

                            <Input
                                label="Department"
                                name="department"
                                value={formData.department}
                                onChange={handleChange}
                                placeholder="IT"
                            />

                            <Input
                                label="Existing Monthly Gross Salary"
                                name="existingMonthlySalary"
                                type="number"
                                value={formData.existingMonthlySalary}
                                onChange={handleChange}
                                placeholder="50000"
                            />

                            <Input
                                label="Revised Monthly Gross Salary"
                                name="revisedMonthlySalary"
                                type="number"
                                value={formData.revisedMonthlySalary}
                                onChange={handleChange}
                                placeholder="55000"
                            />

                            <Input
                                label="Existing Annual CTC"
                                name="existingAnnualCTC"
                                type="number"
                                value={existingAnnualCTC || ""}
                                readOnly
                                placeholder="Auto calculated"
                            />

                            <Input
                                label="Revised Annual CTC"
                                name="revisedAnnualCTC"
                                type="number"
                                value={revisedAnnualCTC || ""}
                                readOnly
                                placeholder="Auto calculated"
                            />

                            <Input
                                label="Appraisal / Increment (%)"
                                name="appraisalPercentage"
                                type="number"
                                value={existingMonthly > 0 ? appraisalPercentage.toFixed(2) : ""}
                                readOnly
                                placeholder="Auto calculated"
                            />

                            <Input
                                label="Effective From"
                                name="effectiveDate"
                                type="date"
                                value={formData.effectiveDate}
                                onChange={handleChange}
                            />
                        </div>
                    </div>
                </div>

                {/* =================================================
                    RIGHT SIDE - PREVIEW
                ================================================= */}

                <div
                    className="
                        min-h-0
                        overflow-y-auto
                        overflow-x-auto
                    "
                >
                    <div
                        ref={letterRef}
                        style={{
                            width: "794px",
                            minHeight: "1123px",
                            margin: "0 auto",
                            padding: "62px 70px 58px",
                            boxSizing: "border-box",
                            fontFamily:
                                "Arial, Helvetica, sans-serif",
                            fontSize: "12.5px",
                            lineHeight: "1.4",
                            backgroundColor: "#ffffff",
                            color: "#111111",
                            boxShadow:
                                "0 1px 2px rgba(0, 0, 0, 0.06)",
                        }}
                    >

                        {/* =================================================
                            HEADER — same company letterhead as reference
                        ================================================= */}

                        <div
                            style={{
                                marginBottom: "18px",
                            }}
                        >
                            <img
                                src={iArtLogo}
                                alt="iART Technologies"
                                style={{
                                    width: "260px",
                                    height: "auto",
                                    display: "block",
                                    marginBottom: "16px",
                                }}
                            />

                            <h1
                                style={{
                                    fontSize: "13px",
                                    fontWeight: "700",
                                    margin: 0,
                                }}
                            >
                                IART TECHNOLOGIES PRIVATE LIMITED
                            </h1>

                            <p
                                style={{
                                    fontSize: "13px",
                                    fontWeight: "700",
                                    margin: "3px 0",
                                }}
                            >
                                SCO 13, Second Floor, Model Town Market, Sector 126, Mohali, Punjab
                            </p>

                            <p
                                style={{
                                    fontSize: "13px",
                                    fontWeight: "700",
                                    margin: "3px 0",
                                }}
                            >
                                Email: contact@iarttechnologies.com
                            </p>
                        </div>

                        <hr
                            style={{
                                margin: "16px 0 20px",
                                border: 0,
                                borderTop: "1px solid #999",
                            }}
                        />

                        {/* TITLE */}

                        <h2
                            style={{
                                textAlign: "center",
                                fontSize: "26px",
                                fontWeight: "700",
                                margin: "0 0 20px",
                                textTransform: "uppercase",
                            }}
                        >
                            APPRAISAL LETTER
                        </h2>

                        {/* TO */}

                        <div
                            style={{
                                marginBottom: "16px",
                            }}
                        >
                            <p style={{ margin: "0 0 3px" }}>
                                To:
                            </p>

                            <p
                                style={{
                                    margin: "0 0 3px",
                                    fontWeight: "700",
                                }}
                            >
                                {formData.candidateName ||
                                    "[Employee Name]"}
                            </p>

                            <p style={{ margin: "0 0 3px" }}>
                                {formData.designation ||
                                    "[Designation]"}
                            </p>

                            <p style={{ margin: "0 0 3px" }}>
                                {formData.department ||
                                    "[Department]"}
                            </p>

                            <p style={{ margin: "0" }}>
                                Employee ID:{" "}
                                {formData.employeeId ||
                                    "[Employee ID]"}
                            </p>
                        </div>

                        {/* SUBJECT */}

                        <p
                            style={{
                                margin: "0 0 14px",
                                fontWeight: "700",
                            }}
                        >
                            Subject: Performance Appraisal and Salary Revision
                        </p>

                        {/* GREETING */}

                        <p style={{ margin: "0 0 24px" }}>
                            Dear{" "}
                            <strong>
                                {formData.candidateName ||
                                    "[Employee Name]"}
                            </strong>
                            ,
                        </p>

                        {/* BODY */}

                        <p>
                            We are pleased to inform you that, based on your performance,
                            contribution, and overall achievements during the appraisal period,
                            the management has reviewed your performance and found it to be
                            satisfactory.
                        </p>

                        <p style={{
                            margin: "20px 0px",
                        }}>
                            We appreciate your dedication, commitment, and valuable contribution
                            to the organization. Your efforts and professional approach have been
                            instrumental in supporting the team and achieving organizational
                            objectives.
                        </p>

                        <p>
                            In recognition of your performance, your compensation has been revised
                            with effect from{" "}
                            <strong>
                                {formData.effectiveDate
                                    ? formatDate(formData.effectiveDate)
                                    : "[Effective Date]"}
                            </strong>
                            .
                        </p>

                        <p
                            style={{
                                margin: "20px 0px",

                            }}
                        >
                            Your revised compensation details are as follows:
                        </p>

                        {/* =================================================
                            COMPENSATION TABLE
                        ================================================= */}

                        <div
                            style={{
                                marginTop: "0",
                            }}
                        >
                            <table
                                style={{
                                    width: "100%",
                                    borderCollapse: "collapse",
                                    marginTop: "0",
                                    marginBottom: "18px",
                                    fontSize: "13px",
                                }}
                            >
                                <thead>
                                    <tr>
                                        <th style={tableHeaderStyle}>
                                            Particulars
                                        </th>
                                        <th style={tableHeaderStyle}>
                                            Existing
                                        </th>
                                        <th style={tableHeaderStyle}>
                                            Revised
                                        </th>
                                    </tr>
                                </thead>

                                <tbody>
                                    <tr>
                                        <td style={tableCellStyle}>
                                            Monthly Gross Salary
                                        </td>
                                        <td style={tableCellStyle}>
                                            ₹
                                            {formData.existingMonthlySalary
                                                ? formatCurrency(
                                                    formData.existingMonthlySalary
                                                )
                                                : "[Amount]"}
                                        </td>
                                        <td style={tableCellStyle}>
                                            ₹
                                            {formData.revisedMonthlySalary
                                                ? formatCurrency(
                                                    formData.revisedMonthlySalary
                                                )
                                                : "[Amount]"}
                                        </td>
                                    </tr>

                                    <tr>
                                        <td style={tableCellStyle}>
                                            Annual CTC
                                        </td>
                                        <td style={tableCellStyle}>
                                            ₹
                                            {existingAnnualCTC
                                                ? formatCurrency(existingAnnualCTC)
                                                : "[Amount]"}
                                        </td>
                                        <td style={tableCellStyle}>
                                            ₹
                                            {revisedAnnualCTC
                                                ? formatCurrency(revisedAnnualCTC)
                                                : "[Amount]"}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>

                            <p>
                                <strong>
                                    Appraisal/Increment:
                                </strong>{" "}
                                {existingMonthly > 0
                                    ? appraisalPercentage.toFixed(2)
                                    : "[Percentage]"}
                                %
                            </p>

                            <p style={{
                                marginBottom: "20px",
                            }} >
                                <strong>
                                    Effective From:
                                </strong>{" "}
                                {formData.effectiveDate
                                    ? formatDate(
                                        formData.effectiveDate
                                    )
                                    : "[Date]"}
                            </p>

                            <p>
                                We look forward to your continued commitment, professional growth,
                                and valuable contribution to the organization. We are confident
                                that you will continue to achieve greater milestones and take on new
                                responsibilities in the coming year.
                            </p>

                            <p>
                                We congratulate you on your appraisal and wish you continued
                                success in your career with IART Technologies Private Limited.
                            </p>

                            <p style={{ marginBottom: "8px" }}>
                                Warm regards,
                            </p>

                            <p
                                style={{
                                    fontWeight: "700",
                                    marginBottom: "8px",
                                }}
                            >
                                For IART Technologies Private Limited
                            </p>


                            {signature && (
                                <img
                                    src={signature}
                                    alt="Authorized signature"
                                    style={{
                                        width: "200px",
                                        maxWidth: "500px",
                                        height: "42px",
                                        objectFit: "contain",
                                        objectPosition: "left center",
                                        display: "block",
                                        marginTop: "10px",
                                    }}
                                />
                            )}
                            <p
                                style={{
                                    fontWeight: "700",
                                    margin: "10px 0",
                                }}
                            >
                                Authorized Signatory
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// =============================================================
// INPUT COMPONENT
// =============================================================

const Input = ({
    label,
    name,
    value,
    onChange,
    type = "text",
    placeholder = "",
}) => {
    return (
        <div>
            <label
                className="
                    block
                    text-sm
                    font-medium
                    text-gray-700
                    mb-1
                "
            >
                {label}
            </label>

            <input
                type={type}
                name={name}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                className="
                    w-full
                    rounded-lg
                    border
                    border-gray-300
                    px-3
                    py-2
                    text-sm
                    focus:outline-none
                    focus:ring-2
                    focus:ring-blue-500
                "
            />
        </div>
    );
};

// =============================================================
// TABLE STYLES
// =============================================================

const tableHeaderStyle = {
    border: "1px solid #222",
    padding: "8px",
    textAlign: "left",
    fontWeight: "700",
};

const tableCellStyle = {
    border: "1px solid #222",
    padding: "8px",
    textAlign: "left",
};
