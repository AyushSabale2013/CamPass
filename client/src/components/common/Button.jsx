const VARIANT_CLASSES = {
  primary: "bg-blue-600 hover:bg-blue-700",
  dark: "bg-slate-800 hover:bg-slate-900",
};

const Button = ({
  children,
  onClick,
  type = "button",
  disabled = false,
  variant = "primary",
}) => {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`
        w-full
        ${VARIANT_CLASSES[variant] || VARIANT_CLASSES.primary}
        active:scale-95
        transition
        duration-200
        rounded-xl
        py-4
        text-lg
        font-semibold
        text-white
        disabled:bg-gray-400
      `}
    >
      {children}
    </button>
  );
};

export default Button;