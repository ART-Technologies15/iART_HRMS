export const getLetterTitle = (type) => {
    const titles = {
        appointment: "Appointment Letter",
        offer: "Offer Letter",
        termination: "Termination Letter",
        appraisal: "Appraisal Letter",
        experience: "Experience Letter",
        relieving: "Relieving Letter",
    };

    return (
        titles[type] ||
        type
            .replace(/[-_]/g, " ")
            .replace(/\b\w/g, (char) => char.toUpperCase())
    );
};