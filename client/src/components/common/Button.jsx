const Button = ({
  children,
  onClick,
  type = "button",
  disabled = false,
}) => {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className="
        w-full
        bg-blue-600
        hover:bg-blue-700
        active:scale-95
        transition
        duration-200
        rounded-xl
        py-4
        text-lg
        font-semibold
        text-white
        disabled:bg-gray-400
      "
    >
      {children}
    </button>
  );
};

export default Button;