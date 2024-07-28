const TokenGenerator = (length) => {
    const a = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890".split("");
    const b = [];
    for (let i = 0; i < length; i++) {
      const j = Math.floor(Math.random() * a.length);
      b[i] = a[j];
    }
    return b.join("");
};
  
export default TokenGenerator;  