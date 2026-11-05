const AccessDenied = () => {
    return (
        <div className="flex min-h-[400px] flex-col items-center justify-center px-6 text-center">
            <h2 className="text-xl font-semibold text-gray-800">
                Access Denied
            </h2>

            <p className="mt-2 max-w-md text-sm text-gray-500">
                You don't have permission to access this page.
                Please contact your administrator if you need access.
            </p>
        </div>
    );
};

export default AccessDenied;