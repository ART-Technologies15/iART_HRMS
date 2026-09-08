import React, { useRef, useState } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import {
  Download,
  FileText,
  Loader2,
} from "lucide-react";

import { getPhoneBook, assignLetter } from "../../api/authApi";
import iArtLogo from "../../assets/logoiart.svg";


export const Offer = () => {
  const letterRef = useRef(null);

  // =========================================================
  // EMPLOYEE
  // =========================================================

  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);

  const [usersLoading, setUsersLoading] = useState(false);
  const [usersLoaded, setUsersLoaded] = useState(false);

  // =========================================================
  // DOWNLOAD STATES
  // =========================================================

  const [pdfLoading, setPdfLoading] = useState(false);
  const [docLoading, setDocLoading] = useState(false);

  // =========================================================
  // SIGNATURE
  //
  // Stored as a data URL so it can be embedded directly — no network
  // fetch, no CORS issues — in the live preview, the html2canvas PDF
  // capture, AND the exported .doc (data URLs survive an innerHTML dump
  // just fine, unlike a blob/object URL would).
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
  // =========================================================

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],

    candidateName: "",
    candidateAddress: "",
    city: "",
    state: "",
    pinCode: "",

    designation: "",
    department: "",
    reportingTo: "",

    joiningDate: "",
    employmentType: "Full-Time",
    workLocation: "Mohali",

    monthlySalary: "",
    probationPeriod: "3",

    workingDays: "Monday to Friday",
    workingHours: "9:00 AM to 6:00 PM",
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
    if (!date) {
      return "DD/MM/YYYY";
    }

    const d = new Date(date);

    if (Number.isNaN(d.getTime())) {
      return date;
    }

    return d.toLocaleDateString("en-GB");
  };

  // =========================================================
  // CURRENCY
  // =========================================================

  const formatCurrency = (amount) => {
    if (!amount) {
      return "0";
    }

    return Number(amount).toLocaleString("en-IN");
  };

  const annualSalary =
    Number(formData.monthlySalary || 0) * 12;

  // =========================================================
  // LOAD PHONEBOOK
  // =========================================================

  const loadPhoneBookUsers = async () => {
    if (usersLoaded || usersLoading) {
      return;
    }

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
      console.error(
        "Phonebook loading error:",
        error
      );

      setUsers([]);
    } finally {
      setUsersLoading(false);
    }
  };

  // =========================================================
  // SELECT EMPLOYEE
  // =========================================================

  const handleUserSelect = (e) => {
    const userId = e.target.value;

    if (!userId) {
      setSelectedUser(null);
      return;
    }

    const employee = users.find(
      (user) => user._id === userId
    );

    if (!employee) {
      return;
    }

    setSelectedUser(employee);

    /*
      Map your phonebook/user fields here.

      If your userdata schema has different names,
      change these mappings accordingly.
    */

    setFormData((prev) => ({
      ...prev,

      candidateName:
        employee.fullName ||
        employee.name ||
        prev.candidateName,

      candidateAddress:
        employee.address ||
        employee.currentAddress ||
        prev.candidateAddress,

      city:
        employee.city ||
        employee.currentLocation?.city ||
        prev.city,

      state:
        employee.state ||
        employee.currentLocation?.state ||
        prev.state,

      pinCode:
        employee.pinCode ||
        employee.pincode ||
        employee.zipCode ||
        prev.pinCode,

      designation:
        employee.designation ||
        prev.designation,

      department:
        employee.department ||
        prev.department,

      workLocation:
        employee.workLocation ||
        employee.currentLocation?.city ||
        prev.workLocation,
    }));
  };

  // =========================================================
  // FILE NAME
  // =========================================================

  const getFileName = (extension) => {
    const candidate =
      formData.candidateName?.trim() ||
      "Candidate";

    const safeName = candidate
      .replace(/[^a-zA-Z0-9 ]/g, "")
      .replace(/\s+/g, "_");

    return `Offer_Letter_${safeName}.${extension}`;
  };

  // =========================================================
  // DOC PRINT
  //
  // IMPORTANT:
  // assignLetter IS NOT CALLED HERE.
  // =========================================================

  const handleDocPrint = async () => {
    if (!letterRef.current || docLoading) {
      return;
    }

    try {
      setDocLoading(true);

      const letterHTML =
        letterRef.current.innerHTML;

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
                color: #111827;
                line-height: 1.6;
                font-size: 11pt;
              }

              h1,
              h2,
              h3,
              h4 {
                color: #111827;
              }

              p {
                margin: 7px 0;
              }

              table {
                width: 100%;
                border-collapse: collapse;
              }

              td,
              th {
                padding: 5px;
              }

              ul {
                margin-top: 5px;
                margin-bottom: 10px;
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
        {
          type: "application/msword",
        }
      );

      const url =
        URL.createObjectURL(blob);

      const anchor =
        document.createElement("a");

      anchor.href = url;
      anchor.download =
        getFileName("doc");

      document.body.appendChild(anchor);

      anchor.click();

      document.body.removeChild(anchor);

      URL.revokeObjectURL(url);

      // =====================================================
      // DO NOT CALL assignLetter HERE
      // =====================================================
    } catch (error) {
      console.error(
        "DOC generation error:",
        error
      );

      alert(
        "Failed to generate DOC file."
      );
    } finally {
      setDocLoading(false);
    }
  };

  // =========================================================
  // GENERATE PDF BLOB
  // =========================================================

  const generatePdfBlob = async () => {
    if (!letterRef.current) {
      throw new Error("Offer letter preview not found.");
    }

    const source = letterRef.current;

    // A4 at 96 CSS pixels per inch. Keeping the render surface at the
    // same size as the preview avoids the "whole document shrunk into
    // four pages" problem from the old single-canvas implementation.
    const PAGE_WIDTH_PX = 794;
    const PAGE_HEIGHT_PX = 1123;
    const PAGE_PADDING_TOP = 78;
    const PAGE_PADDING_RIGHT = 82;
    const PAGE_PADDING_BOTTOM = 72;
    const PAGE_PADDING_LEFT = 82;

    // Wait for fonts and all images (logo/signature) before measuring.
    if (document.fonts?.ready) {
      await document.fonts.ready;
    }

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

    await waitForImages(source);

    // Hidden render area used only while generating the PDF.
    const renderHost = document.createElement("div");
    Object.assign(renderHost.style, {
      position: "fixed",
      left: "-100000px",
      top: "0",
      width: `${PAGE_WIDTH_PX}px`,
      background: "#ffffff",
      zIndex: "-9999",
      pointerEvents: "none",
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
        fontSize: "13px",
        lineHeight: "1.45",
        backgroundColor: "#ffffff",
        color: "#111111",
      });

      // The preview has a shadow for the UI. PDF pages should not.
      page.style.boxShadow = "none";

      renderHost.appendChild(page);
      pages.push(page);
      return page;
    };

    let currentPage = createPage();

    const overflows = (page) =>
      page.scrollHeight > page.clientHeight + 1;

    const sourceChildren = Array.from(source.children);

    for (let index = 0; index < sourceChildren.length; index += 1) {
      const original = sourceChildren[index];
      const clone = original.cloneNode(true);

      // Keep headings with at least the next paragraph/list so a section
      // title never gets stranded at the bottom of a page.
      const isHeading = ["H1", "H2", "H3", "H4"].includes(
        original.tagName
      );

      if (isHeading && sourceChildren[index + 1]) {
        const nextClone = sourceChildren[index + 1].cloneNode(true);
        const group = document.createElement("div");
        group.style.breakInside = "avoid";
        group.style.pageBreakInside = "avoid";
        group.appendChild(clone);
        group.appendChild(nextClone);
        currentPage.appendChild(group);

        if (overflows(currentPage) && currentPage.children.length > 1) {
          currentPage.removeChild(group);
          currentPage = createPage();
          currentPage.appendChild(group);
        }

        index += 1;
        continue;
      }

      clone.style.breakInside = "avoid";
      clone.style.pageBreakInside = "avoid";
      currentPage.appendChild(clone);

      // If this whole block does not fit, move the complete block to the
      // next A4 page instead of slicing through its text.
      if (overflows(currentPage) && currentPage.children.length > 1) {
        currentPage.removeChild(clone);
        currentPage = createPage();
        currentPage.appendChild(clone);
      }
    }

    // Capture one real A4-sized DOM page at a time. Because jsPDF receives
    // already-paginated images, no paragraph/heading can be cut between
    // the bottom of one page and the top of the next.
    try {
      await waitForImages(renderHost);

      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      for (let pageIndex = 0; pageIndex < pages.length; pageIndex += 1) {
        const page = pages[pageIndex];

        const canvas = await html2canvas(page, {
          scale: 2,
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

        if (pageIndex > 0) {
          pdf.addPage();
        }

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
  // PDF PRINT
  //
  // DOWNLOAD PDF
  // THEN IF USER SELECTED:
  // CALL assignLetter
  // =========================================================

  const handlePdfPrint = async () => {
    if (!letterRef.current || pdfLoading) {
      return;
    }

    try {
      setPdfLoading(true);

      // =====================================================
      // 1. GENERATE PDF
      // =====================================================

      const pdfBlob =
        await generatePdfBlob();

      const fileName =
        getFileName("pdf");

      // =====================================================
      // 2. CREATE FILE
      // =====================================================

      const pdfFile = new File(
        [pdfBlob],
        fileName,
        {
          type: "application/pdf",
        }
      );

      // =====================================================
      // 3. DOWNLOAD PDF
      // =====================================================

      const url =
        URL.createObjectURL(
          pdfBlob
        );

      const anchor =
        document.createElement("a");

      anchor.href = url;
      anchor.download = fileName;

      document.body.appendChild(
        anchor
      );

      anchor.click();

      document.body.removeChild(
        anchor
      );

      URL.revokeObjectURL(url);

      // =====================================================
      // 4. ASSIGN ONLY IF USER SELECTED
      // =====================================================

      if (selectedUser?._id) {
        const assignFormData =
          new FormData();

        assignFormData.append(
          "userId",
          selectedUser._id
        );

        assignFormData.append(
          "type",
          "offer"
        );

        assignFormData.append(
          "file",
          pdfFile
        );

        const response =
          await assignLetter(
            assignFormData
          );

        if (!response?.success) {
          console.error(
            "Letter downloaded but assignment failed:",
            response
          );

          alert(
            response?.message ||
            "PDF downloaded, but the offer letter could not be assigned."
          );

          return;
        }

        console.log(
          "Offer letter assigned successfully."
        );
      }

      // =====================================================
      // IF NO USER SELECTED:
      // PDF ONLY DOWNLOADS
      // =====================================================
    } catch (error) {
      console.error(
        "PDF generation error:",
        error
      );

      alert(
        error?.message ||
        "Failed to generate PDF."
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

          {/* =================================================
              EMPLOYEE DROPDOWN
          ================================================= */}

          <div className="w-full xl:max-w-md">

            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Select Employee
            </label>

            <select
              value={
                selectedUser?._id || ""
              }
              onFocus={
                loadPhoneBookUsers
              }
              onClick={
                loadPhoneBookUsers
              }
              onChange={
                handleUserSelect
              }
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
              Employee selection is optional.
              Assignment happens only when
              PDF Print is clicked.
            </p>
          </div>

          {/* =================================================
              SIGNATURE UPLOAD
          ================================================= */}

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
              Appears below "Authorized Signatory" on the letter.
            </p>
          </div>

          {/* =================================================
              DOWNLOAD BUTTONS
          ================================================= */}

          <div className="flex gap-2">

            {/* DOC */}
            <button
              type="button"
              onClick={
                handleDocPrint
              }
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
                <FileText
                  size={17}
                />
              )}

              Doc Print
            </button>

            {/* PDF */}
            <button
              type="button"
              onClick={
                handlePdfPrint
              }
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
                <Download
                  size={17}
                />
              )}

              PDF Print
            </button>

          </div>
        </div>

        {/* ===================================================
            SELECTED USER MESSAGE
        =================================================== */}

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
            Offer letter will be assigned to{" "}
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
          BOTH HAVE COMPLETELY INDEPENDENT SCROLL
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

        {/* ===================================================
            LEFT SIDE - FORM
        =================================================== */}

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
              Offer Letter Details
            </h2>

            <div className="
              grid
              grid-cols-1
              md:grid-cols-2
              gap-4
            ">

              <Input
                label="Letter Date"
                type="date"
                name="date"
                value={
                  formData.date
                }
                onChange={
                  handleChange
                }
              />

              <Input
                label="Candidate Name"
                name="candidateName"
                value={
                  formData.candidateName
                }
                onChange={
                  handleChange
                }
                placeholder="Candidate full name"
              />

              <Input
                label="Candidate Address"
                name="candidateAddress"
                value={
                  formData.candidateAddress
                }
                onChange={
                  handleChange
                }
                placeholder="Candidate address"
              />

              <Input
                label="City"
                name="city"
                value={
                  formData.city
                }
                onChange={
                  handleChange
                }
              />

              <Input
                label="State"
                name="state"
                value={
                  formData.state
                }
                onChange={
                  handleChange
                }
              />

              <Input
                label="PIN Code"
                name="pinCode"
                value={
                  formData.pinCode
                }
                onChange={
                  handleChange
                }
              />

              <Input
                label="Designation"
                name="designation"
                value={
                  formData.designation
                }
                onChange={
                  handleChange
                }
                placeholder="Software Developer"
              />

              <Input
                label="Department"
                name="department"
                value={
                  formData.department
                }
                onChange={
                  handleChange
                }
                placeholder="IT"
              />

              <Input
                label="Reporting To"
                name="reportingTo"
                value={
                  formData.reportingTo
                }
                onChange={
                  handleChange
                }
                placeholder="Manager / Team Lead"
              />

              <Input
                label="Date of Joining"
                type="date"
                name="joiningDate"
                value={
                  formData.joiningDate
                }
                onChange={
                  handleChange
                }
              />

              {/* Employment Type */}
              <div>
                <label className="
                  block
                  text-sm
                  font-medium
                  text-gray-700
                  mb-1
                ">
                  Employment Type
                </label>

                <select
                  name="employmentType"
                  value={
                    formData.employmentType
                  }
                  onChange={
                    handleChange
                  }
                  className="
                    w-full
                    rounded-lg
                    border
                    border-gray-300
                    px-3
                    py-2
                    text-sm
                  "
                >
                  <option value="Full-Time">
                    Full-Time
                  </option>

                  <option value="Part-Time">
                    Part-Time
                  </option>

                  <option value="Contract">
                    Contract
                  </option>
                </select>
              </div>

              <Input
                label="Work Location"
                name="workLocation"
                value={
                  formData.workLocation
                }
                onChange={
                  handleChange
                }
                placeholder="Mohali / Remote / Hybrid"
              />

              <Input
                label="Monthly Gross Salary"
                type="number"
                name="monthlySalary"
                value={
                  formData.monthlySalary
                }
                onChange={
                  handleChange
                }
                placeholder="50000"
              />

              {/* Probation */}
              <div>
                <label className="
                  block
                  text-sm
                  font-medium
                  text-gray-700
                  mb-1
                ">
                  Probation Period
                </label>

                <select
                  name="probationPeriod"
                  value={
                    formData.probationPeriod
                  }
                  onChange={
                    handleChange
                  }
                  className="
                    w-full
                    rounded-lg
                    border
                    border-gray-300
                    px-3
                    py-2
                    text-sm
                  "
                >
                  <option value="3">
                    3 Months
                  </option>

                  <option value="6">
                    6 Months
                  </option>
                </select>
              </div>

              <Input
                label="Working Days"
                name="workingDays"
                value={
                  formData.workingDays
                }
                onChange={
                  handleChange
                }
                placeholder="Monday to Friday"
              />

              <Input
                label="Working Hours"
                name="workingHours"
                value={
                  formData.workingHours
                }
                onChange={
                  handleChange
                }
                placeholder="9:00 AM to 6:00 PM"
              />

            </div>
          </div>

        </div>

        {/* ===================================================
            RIGHT SIDE - PREVIEW
        =================================================== */}

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
              padding: "78px 82px 72px",
              boxSizing: "border-box",
              fontFamily:
                "Arial, Helvetica, sans-serif",
              fontSize: "13px",
              lineHeight: "1.45",
              backgroundColor: "#ffffff",
              color: "#111827",
              boxShadow: "0 1px 2px rgba(0, 0, 0, 0.06)",
            }}
          >

            {/* =================================================
                HEADER — letterhead, matching the reference PDF:
                logo stacked above the company name/address block,
                everything left-aligned (not centered).
            ================================================= */}

            <div
              style={{
                marginBottom: "24px",
              }}
            >
              <img
                src={iArtLogo}
                alt="iART Technologies"
                style={{
                  width: "260px",
                  height: "auto",
                  display: "block",
                  marginBottom: "22px",
                }}
              />


              <h1
                style={{
                  fontSize: "13px",
                  fontWeight: "700",
                  margin: 0,
                }}
              >
                IART TECHNOLOGIES
                PRIVATE LIMITED
              </h1>

              <p
                style={{
                  fontSize: "13px",
                  fontWeight: "700",
                }}
              >
                SCO 13, Second Floor,
                Model Town Market,
                Sector 126, Mohali,
                Punjab
              </p>

              <p
                style={{
                  fontSize: "13px",
                  fontWeight: "700",
                }}
              >
                Email: contact@iarttechnologies.com
              </p>
            </div>

            <hr style={{ margin: "20px 0", border: 0, borderTop: "1px solid #999" }} />

            <h2
              style={{
                textAlign: "center",
                fontSize: "30px",
                fontWeight: "700",
                marginBottom: "20px",
              }}
            >
              Offer Letter
            </h2>

            {/* =================================================
                DATE
            ================================================= */}

            <p>
              <strong>
                Date:
              </strong>{" "}
              {formatDate(
                formData.date
              )}
            </p>

            {/* =================================================
                CANDIDATE ADDRESS
            ================================================= */}

            <div
              style={{
                marginTop: "15px",
              }}
            >
              <strong>
                To,
              </strong>

              <div>
                <strong>
                  {formData.candidateName ||
                    "[Candidate Full Name]"}
                </strong>
              </div>

              <div>
                {formData.candidateAddress ||
                  "[Candidate Address]"}
              </div>

              <div>
                {[
                  formData.city,
                  formData.state,
                  formData.pinCode,
                ]
                  .filter(Boolean)
                  .join(", ") ||
                  "[City, State, PIN Code]"}
              </div>
            </div>

            {/* =================================================
                SUBJECT
            ================================================= */}

            <p
              style={{
                marginTop: "22px",
                fontWeight: "700",
              }}
            >
              Subject: Offer of Employment –{" "}
              {formData.designation ||
                "[Designation]"}
            </p>

            {/* =================================================
                INTRODUCTION
            ================================================= */}

            <p>
              Dear{" "}
              <strong>
                {formData.candidateName ||
                  "[Candidate Name]"}
              </strong>
              ,
            </p>

            <p>
              We are pleased to offer you
              employment with{" "}
              <strong>
                IART Technologies Private
                Limited
              </strong>{" "}
              for the position of{" "}
              <strong>
                {formData.designation ||
                  "[Designation]"}
              </strong>{" "}
              in the{" "}
              <strong>
                {formData.department ||
                  "[Department]"}
              </strong>{" "}
              department.
            </p>

            <p>
              We were impressed by your
              qualifications, skills, and
              experience, and believe that you
              will be a valuable addition to
              our organization.
            </p>

            {/* =================================================
                1. POSITION
            ================================================= */}

            <SectionTitle>
              1. Position & Joining
            </SectionTitle>

            <InfoLine
              label="Designation"
              value={
                formData.designation ||
                "[Designation]"
              }
            />

            <InfoLine
              label="Department"
              value={
                formData.department ||
                "[Department]"
              }
            />

            <InfoLine
              label="Reporting To"
              value={
                formData.reportingTo ||
                "[Manager/Team Lead Name]"
              }
            />

            <InfoLine
              label="Date of Joining"
              value={formatDate(
                formData.joiningDate
              )}
            />

            <InfoLine
              label="Employment Type"
              value={
                formData.employmentType
              }
            />

            <InfoLine
              label="Work Location"
              value={
                formData.workLocation ||
                "[Office Location / Remote / Hybrid]"
              }
            />

            {/* =================================================
                2. COMPENSATION
            ================================================= */}

            <SectionTitle>
              2. Compensation & Salary
            </SectionTitle>

            <p>
              Your{" "}
              <strong>
                monthly gross salary
              </strong>{" "}
              will be{" "}
              <strong>
                ₹
                {formData.monthlySalary
                  ? formatCurrency(
                    formData.monthlySalary
                  )
                  : "[Monthly Salary]"}{" "}
                per month
              </strong>
              .
            </p>

            <p>
              The salary will be paid on a
              monthly basis, subject to
              applicable statutory
              deductions, taxes, and other
              deductions as per Company policy
              and applicable laws.
            </p>

            <p>
              <strong>
                Salary Details:
              </strong>
            </p>

            <InfoLine
              label="Monthly Gross Salary"
              value={`₹${formData.monthlySalary
                ? formatCurrency(
                  formData.monthlySalary
                )
                : "[Amount]"
                }`}
            />

            <InfoLine
              label="Annual Gross Salary"
              value={`₹${formData.monthlySalary
                ? formatCurrency(
                  annualSalary
                )
                : "[Monthly Amount × 12]"
                }`}
            />

            <InfoLine
              label="Salary Payment"
              value="Monthly"
            />

            <InfoLine
              label="Applicable Deductions"
              value="As per applicable laws and Company policy"
            />

            <p>
              Any applicable deductions,
              including but not limited to
              statutory contributions, taxes,
              advances, loans, or other
              authorized deductions, may be
              deducted from your salary.
            </p>

            <p>
              The Company reserves the right
              to revise the salary structure
              based on performance, business
              requirements, promotion, or other
              applicable Company policies.
            </p>

            {/* =================================================
                3. PROBATION
            ================================================= */}

            <SectionTitle>
              3. Probation Period
            </SectionTitle>

            <p>
              You will be on probation for a
              period of{" "}
              <strong>
                {formData.probationPeriod}{" "}
                months
              </strong>{" "}
              from your date of joining.
            </p>

            <p>
              During the probation period,
              your performance, conduct,
              attendance, and overall
              suitability for the role will be
              evaluated.
            </p>

            <p>
              Upon successful completion of
              the probation period, your
              employment may be confirmed in
              accordance with company policy.
            </p>

            {/* =================================================
                4. WORKING HOURS
            ================================================= */}

            <SectionTitle>
              4. Working Hours
            </SectionTitle>

            <p>
              Your regular working hours will
              be:
            </p>

            <p>
              <strong>
                {formData.workingDays}:{" "}
                {formData.workingHours}
              </strong>
            </p>

            <p>
              You may occasionally be
              required to work beyond regular
              working hours depending on
              project requirements, deadlines,
              or business requirements.
            </p>

            {/* =================================================
                5. CONFIDENTIALITY
            ================================================= */}

            <SectionTitle>
              5. Confidentiality and
              Intellectual Property
            </SectionTitle>

            <p>
              As a condition of your
              employment, you will be required
              to sign a{" "}
              <strong>
                Confidentiality and
                Intellectual Property
                Agreement
              </strong>{" "}
              to protect the Company's
              sensitive information,
              confidential information,
              proprietary technology,
              intellectual property, and
              business interests.
            </p>

            <p>
              For the purpose of your
              employment,{" "}
              <strong>
                "Confidential Information"
              </strong>{" "}
              shall mean and include
              information that is confidential,
              including Proprietary
              Information and other
              information relating to the
              business of the Company, its
              affiliates, clients, customers,
              vendors, or any third parties
              with which the Company
              associates, whether or not such
              information is expressly marked
              or designated as confidential.
            </p>

            <p>
              Confidential Information
              includes, but is not limited to:
            </p>

            <p>
              <strong>
                a) Information of value or
                significance to the Company or
                its competitors:
              </strong>
            </p>

            <NumberPoint number="i.">
              Data relating to or concerning
              the Company or its vendors,
              customers, employees, advisors,
              mentors, service providers, or
              consultants, including contact
              information and sales
              information.
            </NumberPoint>

            <NumberPoint number="ii.">
              Information concerning the
              Company's compliance with
              applicable laws, including
              information relating to licenses,
              permissions, approvals, or
              consents.
            </NumberPoint>

            <NumberPoint number="iii.">
              Information concerning filings
              and official submissions made by
              the Company to governmental or
              regulatory authorities.
            </NumberPoint>

            <NumberPoint number="iv.">
              Information relating to the
              Company's business, existing and
              upcoming products and services,
              business strategy, pricing
              information and business plans.
            </NumberPoint>

            <NumberPoint number="v.">
              Any data, documents, sketches,
              designs, plans, drawings,
              photographs, reports,
              communications, technical
              information, Intellectual
              Property Rights, user
              information, know-how, research
              and development information,
              and internal policies.
            </NumberPoint>

            <NumberPoint number="vi.">
              Any information relating to the
              Company's technology, software,
              hardware, source code, designs,
              internal systems, technical
              architecture, and business
              architecture.
            </NumberPoint>

            <NumberPoint number="vii.">
              Financial information,
              including budgets, fees, revenue
              calculations, sales figures,
              financial statements, profit
              expectations, inventories, and
              other financial data.
            </NumberPoint>

            <NumberPoint number="viii.">
              Training information and
              resources, including documents,
              videos, processes, multimedia
              files, presentations, learning
              materials and other training
              resources.
            </NumberPoint>

            <NumberPoint number="ix.">
              Security information, including
              passwords, login credentials,
              access keys, authentication
              information and other
              credentials used to access
              Company resources.
            </NumberPoint>

            <NumberPoint number="x.">
              Client or user data, user
              credits, analytics, preferences,
              feedback and other information
              relating to clients or users.
            </NumberPoint>

            <p>
              <strong>
                b)
              </strong>{" "}
              Any information which may
              reasonably be understood, by its
              nature or by the context of its
              disclosure, to be confidential.
            </p>

            <p>
              <strong>
                c)
              </strong>{" "}
              Any information derived from
              any of the above-mentioned
              information.
            </p>

            <p>
              <strong>
                d)
              </strong>{" "}
              Original information supplied by
              the Company or information
              provided to the Company by third
              parties that the Company is
              obligated to keep confidential.
            </p>

            <p>
              You agree that you shall not,
              during or after your employment,
              disclose, reproduce, copy,
              distribute, misuse, or make
              available any Confidential
              Information to any unauthorized
              person or third party without
              prior written authorization from
              the Company.
            </p>

            <p>
              You shall take all reasonable
              steps to protect Confidential
              Information from unauthorized
              access, disclosure, loss, or
              misuse.
            </p>

            {/* Intellectual Property */}

            <h3
              style={{
                fontSize: "14px",
                fontWeight: "700",
                marginTop: "15px",
              }}
            >
              Intellectual Property
            </h3>

            <p>
              Any software, source code,
              applications, documentation,
              designs, graphics, inventions,
              concepts, processes, technical
              solutions, databases, reports,
              materials, or other work products
              created, developed, modified, or
              contributed to by you during the
              course of your employment, or
              using Company resources, systems,
              information, or intellectual
              property, shall be governed by
              the Company's Intellectual
              Property Agreement and applicable
              law.
            </p>

            <p>
              You agree to cooperate with the
              Company in executing any
              documents or taking any reasonable
              actions required to establish,
              protect, or enforce the Company's
              rights in such Intellectual
              Property.
            </p>

            <p>
              You shall not use, copy,
              transfer, publish, distribute,
              sell, or commercially exploit the
              Company's Intellectual Property
              or Confidential Information
              without prior written
              authorization.
            </p>

            {/* =================================================
                6. TERMINATION
            ================================================= */}

            <SectionTitle>
              6. Termination
            </SectionTitle>

            <p>
              Either party may terminate this
              employment by providing{" "}
              <strong>
                three (3) months' prior written
                notice
              </strong>{" "}
              to the other party.
            </p>

            <p>
              The Company reserves the right
              to terminate employment without
              notice in cases of{" "}
              <strong>
                gross misconduct, fraud,
                serious violation of Company
                policies, breach of
                confidentiality, unauthorized
                disclosure or misuse of Company
                information, violation of
                security requirements, or other
                circumstances permitted under
                applicable law
              </strong>
              .
            </p>

            <p>
              Upon termination or resignation,
              you shall immediately return all
              Company property, documents,
              devices, access credentials,
              data, files, source code, and
              other materials belonging to the
              Company and shall not retain
              copies of Confidential
              Information.
            </p>

            {/* =================================================
                7. LEAVE
            ================================================= */}

            <SectionTitle>
              7. Leave Policy
            </SectionTitle>

            <p>
              You will be entitled to leave in
              accordance with the Company's
              Leave Policy and applicable laws.
            </p>

            <p>
              The current leave entitlement is:
            </p>

            <ul>
              <li>
                <strong>
                  Casual Leave:
                </strong>{" "}
                12 days per year
              </li>

              <li>
                <strong>
                  Sick Leave:
                </strong>{" "}
                1 day per month
              </li>
            </ul>

            <p>
              Leave must be applied for and
              approved in accordance with the
              Company's leave and attendance
              procedures.
            </p>

            {/* =================================================
                8. RESPONSIBILITIES
            ================================================= */}

            <SectionTitle>
              8. Roles & Responsibilities
            </SectionTitle>

            <p>
              You will be responsible for
              performing duties associated with
              your position and any other
              reasonable responsibilities
              assigned by your reporting manager
              or management from time to time.
            </p>

            <p>
              You are expected to maintain
              professional standards, meet
              assigned deadlines, maintain
              regular attendance, and
              contribute positively to the
              Company's goals.
            </p>

            {/* =================================================
                9. COMPANY POLICIES
            ================================================= */}

            <SectionTitle>
              9. Company Policies
            </SectionTitle>

            <p>
              During your employment, you will
              be required to comply with all
              Company rules, policies,
              procedures, information-security
              requirements, confidentiality
              obligations, and applicable laws.
            </p>

            <p>
              The Company reserves the right
              to amend its policies from time
              to time.
            </p>

            {/* =================================================
                10. BENEFITS
            ================================================= */}

            <SectionTitle>
              10. Benefits
            </SectionTitle>

            <p>
              You will be entitled to applicable
              employee benefits, holidays,
              leave, and other facilities in
              accordance with Company policies
              and your employment terms.
            </p>

            {/* =================================================
                11. DOCUMENTS
            ================================================= */}

            <SectionTitle>
              11. Documents Required
            </SectionTitle>

            <p>
              You are required to submit the
              following documents at the time
              of joining:
            </p>

            <ul>
              <li>
                Aadhaar Card
              </li>

              <li>
                PAN Card
              </li>

              <li>
                Educational Qualification
                Certificates
              </li>

              <li>
                Previous Employment
                Documents, if applicable
              </li>

              <li>
                Bank Account Details
              </li>

              <li>
                Passport-size Photograph
              </li>

              <li>
                Any other documents requested
                by the Company
              </li>
            </ul>

            {/* =================================================
                12. ACCEPTANCE
            ================================================= */}

            <SectionTitle>
              12. Acceptance of Offer
            </SectionTitle>

            <p>
              Please sign and return a copy of
              this Offer Letter as confirmation
              of your acceptance of the terms
              and conditions mentioned above.
            </p>

            <p>
              We are delighted to welcome you
              to{" "}
              <strong>
                IART Technologies Private
                Limited
              </strong>{" "}
              and look forward to your
              contribution and growth with the
              organization.
            </p>

            <p>
              We wish you a successful and
              rewarding career with us.
            </p>

            {/* =================================================
                COMPANY SIGNATURE — matches the reference PDF:
                "For IART..." then "Authorized Signatory", with the
                uploaded signature image sitting below the label.
            ================================================= */}

            <div
              style={{
                marginTop: "35px",
              }}
            >
              <p>
                <strong>
                  For IART Technologies
                  Private Limited
                </strong>
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

              <p style={{ marginTop: "10px", marginBottom: "4px" }}>
                <strong>
                  Authorized Signatory
                </strong>
              </p>
            </div>

            {/* =================================================
                SEPARATOR
            ================================================= */}

            <hr
              style={{
                margin:
                  "28px 0 20px",
                border: 0,
                borderTop:
                  "1px solid #999",
              }}
            />

            {/* =================================================
                CANDIDATE ACCEPTANCE
            ================================================= */}

            <h2
              style={{
                textAlign: "left",
                fontSize: "18px",
                fontWeight: "700",
                marginBottom: "12px",
              }}
            >
              CANDIDATE ACCEPTANCE
            </h2>

            <p>
              I,{" "}
              <strong>
                {formData.candidateName ||
                  "[Candidate Full Name]"}
              </strong>
              , hereby accept the offer of
              employment with{" "}
              <strong>
                IART Technologies Private
                Limited
              </strong>{" "}
              and agree to abide by the terms
              and conditions mentioned in this
              Offer Letter, the
              Confidentiality and Intellectual
              Property Agreement, and
              applicable Company policies.
            </p>

            <div
              style={{
                marginTop: "18px",
              }}
            >
              <p>
                <strong>
                  Candidate Name:
                </strong>{" "}
                ________________________________
              </p>

              <p>
                <strong>
                  Signature:
                </strong>{" "}
                ______________________________________
              </p>

              <p>
                <strong>
                  Date:
                </strong>{" "}
                _________________________________________
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
      <label className="
        block
        text-sm
        font-medium
        text-gray-700
        mb-1
      ">
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
// SECTION TITLE
// =============================================================

const SectionTitle = ({
  children,
}) => {
  return (
    <h2
      style={{
        fontSize: "15px",
        fontWeight: "700",
        marginTop: "22px",
        marginBottom: "8px",
      }}
    >
      {children}
    </h2>
  );
};

// =============================================================
// INFO LINE
// =============================================================

const InfoLine = ({
  label,
  value,
}) => {
  return (
    <p
      style={{
        margin: "3px 0",
      }}
    >
      •{" "}
      <strong>
        {label}:
      </strong>{" "}
      {value}
    </p>
  );
};

// =============================================================
// NUMBER POINT
// =============================================================

const NumberPoint = ({
  number,
  children,
}) => {
  return (
    <p
      style={{
        marginLeft: "15px",
        marginTop: "5px",
      }}
    >
      <strong>
        {number}
      </strong>{" "}
      {children}
    </p>
  );
};