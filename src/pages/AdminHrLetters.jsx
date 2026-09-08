import React, { useState } from 'react'
import { Appointment } from '../components/AdminHrLetterFormats/Appointment';
import { Offer } from '../components/AdminHrLetterFormats/Offer';
import { Termination } from '../components/AdminHrLetterFormats/Termination';
import { Appraisal } from '../components/AdminHrLetterFormats/Appraisal';
import { Experience } from '../components/AdminHrLetterFormats/Experience';
import { Relieving } from '../components/AdminHrLetterFormats/Relieving';

export const AdminHrLetters = () => {
    const [letterType, setLetterType] = useState("appointment");

    return (
        <div className="h-full flex flex-col p-2 gap-4 bg-[#F3F8FB] max-w-full overflow-hidden">
            {/* -------------------------------- Header + Filters ------------------------------- */}
            <div className="flex justify-between items-center shrink-0">
                <h1 className="text-xl sm:text-2xl font-semibold text-gray-800">Create Letters</h1>

                <select
                    value={letterType}
                    onChange={(e) => setLetterType(e.target.value)}
                    className="border border-gray-300 rounded-md px-3 py-1.5 text-sm"
                >
                    <option value="appointment">Appointment Letter</option>
                    <option value="offer">Offer Letter</option>
                    {/* <option value="termination">Termination Letter</option> */}
                    <option value="appraisal">Appraisal Letter</option>
                    <option value="experience">Experience Letter</option>
                    <option value="relieving">Relieving Letter</option>
                </select>
            </div>

            {/* -------------------------------- Letter Formats ------------------------------- */}
            <div className="flex-1 overflow-auto">
                {letterType === "appointment" && <div> <Appointment /> </div>}
                {letterType === "offer" && <div> <Offer /> </div>}
                {/* {letterType === "termination" && <div> <Termination /> </div>} */}
                {letterType === "appraisal" && <div> <Appraisal /> </div>}
                {letterType === "experience" && <div> <Experience /> </div>}
                {letterType === "relieving" && <div> <Relieving /> </div>}
            </div>
        </div>
    )
}
