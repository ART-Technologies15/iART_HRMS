export const getErrorMessage = (err) => {
  console.log("error", err);

  return (
    err?.response?.data?.message ||
    err?.response?.data?.error ||
    err?.message ||
    "Something went wrong"
  );
};