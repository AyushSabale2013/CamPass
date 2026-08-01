const PageContainer = ({ children }) => {
  return (
    <div className="min-h-screen bg-slate-100 flex justify-center">
      <div className="w-full max-w-md min-h-screen bg-white shadow-xl">
        {children}
      </div>
    </div>
  );
};

export default PageContainer;