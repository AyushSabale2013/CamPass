const Card = ({ children }) => {
  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      {children}
    </div>
  );
};

export default Card;