import CryptoJS from 'crypto-js';

export const generateSignature = () => {
  const apiKey = 'your-secret-key';
  const timestamp = Math.floor(Date.now() / 1000);

  const hash = CryptoJS.HmacSHA256(String(timestamp), apiKey).toString(
    CryptoJS.enc.Hex
  );

  return { timestamp, hash };
};
