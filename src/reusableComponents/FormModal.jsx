import Modal from "./Model";
import Button from "./Button";

/**
 * Reusable form modal.
 * Props:
 *  - isOpen, onClose, title
 *  - onSubmit, submitting
 *  - submitLabel, cancelLabel
 *  - size (sm|md|lg|xl)
 *  - children: form fields
 */
const FormModal = ({
  isOpen,
  onClose,
  title,
  onSubmit,
  submitting = false,
  submitLabel = "Save",
  cancelLabel = "Cancel",
  size = "md",
  children,
}) => {
  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit?.(e);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size={size}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            {cancelLabel}
          </Button>
          <Button type="submit" variant="green" loading={submitting} onClick={handleSubmit}>
            {submitLabel}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {children}
      </form>
    </Modal>
  );
};

export default FormModal;
