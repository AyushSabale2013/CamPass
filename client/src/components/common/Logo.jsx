import logoImg from "../../assets/iiitp_logo.png";

const Logo = () => {
  return (
    <div className="flex flex-col items-center pt-16">

      <img
        src={logoImg}
        alt="College Logo"
        className="w-60 h-60 object-contain"
      />

      <h1 className="text-4xl font-bold mt-6 text-slate-800">
        CamPass
      </h1>

      <p className="mt-3 text-gray-500">
        Campus Entry Management
      </p>

    </div>
  );
};

export default Logo;