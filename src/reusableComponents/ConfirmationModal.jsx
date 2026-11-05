import Modal from "./Model";
import Button from "./Button";

const ConfirmationModal = ({
  isOpen,
  onClose,
  onConfirm,

  title = "Confirm Action",
  message = "Are you sure you want to continue?",

  confirmText = "Confirm",
  cancelText = "Cancel",

  confirmVariant = "danger",
  loading = false,

  size = "sm",
}) => {
  const handleConfirm = () => {
    onConfirm?.();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={loading ? undefined : onClose}
      title={title}
      size={size}
      closeOnBackdrop={!loading}
      className="px-4 py-3"
      footer={
        <>
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={loading}
          >
            {cancelText}
          </Button>

          <Button
            type="button"
            variant={confirmVariant}
            loading={loading}
            onClick={handleConfirm}
          >
            {confirmText}
          </Button>
        </>
      }
    >
      <div className="py-2">
        <p className="text-sm leading-6 text-slate-600 dark:text-zinc-300">{message}</p>
      </div>
    </Modal>
  );
};

export default ConfirmationModal;
