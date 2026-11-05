import { Navigate, useLocation } from "react-router-dom";
import { usePermissions } from "../../features/auth/usePermissions";

const RequirePermission = ({
    permission,
    children,
    redirectTo = "/dashboard",
}) => {
    const location = useLocation();
    const { hasPermission } = usePermissions();

    const allowed = hasPermission(permission);

    if (!allowed) {
        return (
            <Navigate
                to={redirectTo}
                state={{ from: location, accessDenied: true }}
                replace
            />
        );
    }

    return children;
};

export default RequirePermission;