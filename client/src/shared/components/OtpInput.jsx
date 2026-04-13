import { useState, useRef, useEffect } from 'react';

const OtpInput = ({ length = 4, onComplete, dark }) => {
  const [otp, setOtp] = useState(new Array(length).fill(""));
  const inputRefs = useRef([]);

  const handleChange = (index, value) => {
    if (isNaN(value)) return;
    const newOtp = [...otp];
    // allow only one character
    newOtp[index] = value.substring(value.length - 1);
    setOtp(newOtp);

    // submit if all filled
    const combinedOtp = newOtp.join("");
    if (combinedOtp.length === length) onComplete(combinedOtp);

    // move to next input
    if (value && index < length - 1) {
      inputRefs.current[index + 1].focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1].focus();
    }
  };

  const handlePaste = (e) => {
    const data = e.clipboardData.getData("text").slice(0, length);
    if (!/^\d+$/.test(data)) return;
    
    const newOtp = data.split("");
    setOtp(newOtp);
    onComplete(data);
    
    // Focus last or next available
    const nextIdx = Math.min(newOtp.length, length - 1);
    inputRefs.current[nextIdx].focus();
  };

  return (
    <div className="flex gap-3 justify-center">
      {otp.map((digit, index) => (
        <input
          key={index}
          type="text"
          maxLength={1}
          value={digit}
          ref={(el) => (inputRefs.current[index] = el)}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          className={`h-12 w-12 rounded-xl border-2 text-center text-xl font-bold transition-all focus:outline-none focus:ring-2 focus:ring-green-500 ${
            dark 
              ? 'bg-slate-800 border-slate-700 text-white' 
              : 'bg-white border-slate-200 text-slate-800'
          }`}
        />
      ))}
    </div>
  );
};

export default OtpInput;
