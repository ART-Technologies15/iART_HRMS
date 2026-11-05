const Card = ({ children, className = "", title, action, ...rest }) => {
  return (
    <div className={`card ${className}`} {...rest}>
      {(title || action) && (
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          {title && (
            <h3 className="text-base font-semibold text-slate-800">{title}</h3>
          )}
          {action}
        </div>
      )}
      {children}
    </div>
  );
};

export default Card;
